import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { GoogleAuthService } from "./google-auth.service.js";
import {
  SessionMeetEvent,
  MeetEventStatus,
} from "../entities/session-meet-event.entity.js";
import { Session } from "../../sessions/entities/session.entity.js";

/**
 * Meet information included in session responses
 * Note: Also defined in @thrive/shared for cross-package use
 */
interface SessionMeetInfo {
  meetLink: string | null;
  meetEventId: string | null;
  meetStatus:
    | "PENDING"
    | "CREATING"
    | "READY"
    | "UPDATING"
    | "ERROR"
    | "CANCELED";
}

// Google Calendar API base URL
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
    conferenceSolution?: {
      key: {
        type: string;
      };
      name: string;
      iconUri: string;
    };
    conferenceId?: string;
  };
  hangoutLink?: string;
}

interface CalendarEventResponse extends CalendarEvent {
  id: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
}

interface MeetCreationResult {
  success: boolean;
  eventId?: string;
  meetLink?: string;
  error?: string;
}

/**
 * Service for creating and managing Google Meet events via Calendar API
 */
@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);

  // Retry configuration
  private readonly maxRetries = 3;
  private readonly retryDelays = [5000, 30000, 120000]; // 5s, 30s, 2min

  constructor(
    private readonly googleAuthService: GoogleAuthService,
    @InjectRepository(SessionMeetEvent)
    private readonly meetEventRepo: Repository<SessionMeetEvent>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  /**
   * Create a Google Meet for a session
   */
  async createMeetForSession(
    sessionId: number,
    title?: string,
  ): Promise<MeetCreationResult> {
    // Get session details
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ["teacher"],
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Get or create meet event record
    let meetEvent = await this.meetEventRepo.findOne({
      where: { sessionId },
    });

    if (!meetEvent) {
      meetEvent = this.meetEventRepo.create({
        sessionId,
        status: MeetEventStatus.PENDING,
      });
      meetEvent = await this.meetEventRepo.save(meetEvent);
    }

    // Check if already has a valid meet
    if (meetEvent.status === MeetEventStatus.READY && meetEvent.hangoutLink) {
      return {
        success: true,
        eventId: meetEvent.googleEventId || undefined,
        meetLink: meetEvent.hangoutLink,
      };
    }

    // Get teacher's access token
    const accessToken = await this.googleAuthService.getAccessToken(
      session.teacherId,
    );

    if (!accessToken) {
      meetEvent.status = MeetEventStatus.ERROR;
      meetEvent.lastError = "Teacher has not connected Google Calendar";
      await this.meetEventRepo.save(meetEvent);
      return { success: false, error: meetEvent.lastError };
    }

    // Mark as creating
    meetEvent.status = MeetEventStatus.CREATING;
    await this.meetEventRepo.save(meetEvent);

    try {
      const result = await this.createCalendarEvent(
        accessToken,
        session,
        title,
      );

      meetEvent.googleEventId = result.eventId || null;
      meetEvent.hangoutLink = result.meetLink || null;
      meetEvent.status = result.meetLink
        ? MeetEventStatus.READY
        : MeetEventStatus.ERROR;
      meetEvent.lastError = result.error || null;
      meetEvent.retryCount = 0;
      meetEvent.nextRetryAt = null;

      await this.meetEventRepo.save(meetEvent);

      // Also update the session's meeting_url field
      if (result.meetLink) {
        session.meetingUrl = result.meetLink;
        await this.sessionRepo.save(session);
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to create Meet for session ${sessionId}: ${errorMessage}`,
      );

      meetEvent.status = MeetEventStatus.ERROR;
      meetEvent.lastError = errorMessage;
      meetEvent.retryCount++;

      // Schedule retry if under max retries
      if (meetEvent.retryCount < this.maxRetries) {
        const delay = this.retryDelays[meetEvent.retryCount - 1] || 120000;
        meetEvent.nextRetryAt = new Date(Date.now() + delay);
      }

      await this.meetEventRepo.save(meetEvent);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create a calendar event with Google Meet
   */
  private async createCalendarEvent(
    accessToken: string,
    session: Session,
    title?: string,
  ): Promise<MeetCreationResult> {
    const eventTitle = title || `Session #${session.id}`;
    const requestId = `meet-${session.id}-${Date.now()}`;

    const event: CalendarEvent = {
      summary: eventTitle,
      description: `Scheduled session via Thrive`,
      start: {
        dateTime: session.startAt.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: session.endAt.toISOString(),
        timeZone: "UTC",
      },
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Google Calendar API error: ${errorBody}`);
      throw new Error(`Calendar API error: ${response.status}`);
    }

    const createdEvent = (await response.json()) as CalendarEventResponse;

    const meetLink =
      createdEvent.hangoutLink ||
      createdEvent.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === "video",
      )?.uri;

    return {
      success: !!meetLink,
      eventId: createdEvent.id,
      meetLink,
      error: meetLink ? undefined : "No meet link in response",
    };
  }

  /**
   * Update a calendar event (for rescheduling)
   */
  async updateMeetForSession(
    sessionId: number,
    newStartAt: Date,
    newEndAt: Date,
    title?: string,
  ): Promise<MeetCreationResult> {
    const meetEvent = await this.meetEventRepo.findOne({
      where: { sessionId },
    });

    if (!meetEvent || !meetEvent.googleEventId) {
      // No existing event, create new one
      return this.createMeetForSession(sessionId, title);
    }

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    const accessToken = await this.googleAuthService.getAccessToken(
      session.teacherId,
    );

    if (!accessToken) {
      return { success: false, error: "Teacher not connected" };
    }

    meetEvent.status = MeetEventStatus.UPDATING;
    await this.meetEventRepo.save(meetEvent);

    try {
      const eventPatch = {
        start: {
          dateTime: newStartAt.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: newEndAt.toISOString(),
          timeZone: "UTC",
        },
        summary: title,
      };

      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/primary/events/${meetEvent.googleEventId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventPatch),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Calendar API error: ${response.status} - ${errorBody}`,
        );
      }

      meetEvent.status = MeetEventStatus.READY;
      meetEvent.lastError = null;
      await this.meetEventRepo.save(meetEvent);

      return {
        success: true,
        eventId: meetEvent.googleEventId,
        meetLink: meetEvent.hangoutLink || undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      meetEvent.status = MeetEventStatus.ERROR;
      meetEvent.lastError = errorMessage;
      await this.meetEventRepo.save(meetEvent);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Cancel/delete a calendar event
   */
  async cancelMeetForSession(sessionId: number): Promise<void> {
    const meetEvent = await this.meetEventRepo.findOne({
      where: { sessionId },
    });

    if (!meetEvent || !meetEvent.googleEventId) {
      return;
    }

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      return;
    }

    const accessToken = await this.googleAuthService.getAccessToken(
      session.teacherId,
    );

    if (accessToken) {
      try {
        await fetch(
          `${CALENDAR_API_BASE}/calendars/primary/events/${meetEvent.googleEventId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
      } catch (error) {
        this.logger.warn(
          `Failed to delete calendar event: ${error instanceof Error ? error.message : "unknown"}`,
        );
      }
    }

    meetEvent.status = MeetEventStatus.CANCELED;
    await this.meetEventRepo.save(meetEvent);
  }

  /**
   * Retry Meet creation for a session
   */
  async retryMeetCreation(sessionId: number): Promise<MeetCreationResult> {
    const meetEvent = await this.meetEventRepo.findOne({
      where: { sessionId },
    });

    if (!meetEvent) {
      throw new NotFoundException(
        `No meet event found for session ${sessionId}`,
      );
    }

    // Reset retry count for manual retry
    meetEvent.retryCount = 0;
    meetEvent.status = MeetEventStatus.PENDING;
    await this.meetEventRepo.save(meetEvent);

    return this.createMeetForSession(sessionId);
  }

  /**
   * Get Meet info for a session
   */
  async getMeetInfo(sessionId: number): Promise<SessionMeetInfo | null> {
    const meetEvent = await this.meetEventRepo.findOne({
      where: { sessionId },
    });

    if (!meetEvent) {
      return null;
    }

    return {
      meetLink: meetEvent.hangoutLink,
      meetEventId: meetEvent.googleEventId,
      meetStatus: meetEvent.status as SessionMeetInfo["meetStatus"],
    };
  }

  /**
   * Get Meet info for multiple sessions
   */
  async getMeetInfoBatch(
    sessionIds: number[],
  ): Promise<Map<number, SessionMeetInfo>> {
    const meetEvents = await this.meetEventRepo.find({
      where: { sessionId: In(sessionIds) },
    });

    const result = new Map<number, SessionMeetInfo>();
    for (const event of meetEvents) {
      result.set(event.sessionId, {
        meetLink: event.hangoutLink,
        meetEventId: event.googleEventId,
        meetStatus: event.status as SessionMeetInfo["meetStatus"],
      });
    }

    return result;
  }

  /**
   * Process pending Meet creations (for scheduler)
   */
  async processPendingMeets(): Promise<number> {
    const pending = await this.meetEventRepo.find({
      where: [
        { status: MeetEventStatus.PENDING },
        {
          status: MeetEventStatus.ERROR,
          // nextRetryAt <= now - handled in query
        },
      ],
    });

    // Filter for retries that are due
    const now = new Date();
    const toProcess = pending.filter((event) => {
      if (event.status === MeetEventStatus.PENDING) return true;
      if (event.status === MeetEventStatus.ERROR && event.nextRetryAt) {
        return event.nextRetryAt <= now && event.retryCount < this.maxRetries;
      }
      return false;
    });

    let processed = 0;
    for (const event of toProcess) {
      try {
        await this.createMeetForSession(event.sessionId);
        processed++;
      } catch {
        this.logger.warn(
          `Failed to process Meet for session ${event.sessionId}`,
        );
      }
    }

    return processed;
  }
}
