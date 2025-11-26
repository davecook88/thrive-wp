import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { MeetingService } from "../services/meeting.service.js";
import {
  SessionScheduledEvent,
  SessionRescheduledEvent,
  SessionCanceledEvent,
} from "../events/session.events.js";

/**
 * Event listener for session lifecycle events.
 * Handles Google Meet creation/update/cancellation asynchronously.
 */
@Injectable()
export class MeetEventListener {
  private readonly logger = new Logger(MeetEventListener.name);

  constructor(private readonly meetingService: MeetingService) {}

  @OnEvent(SessionScheduledEvent.eventName)
  async handleSessionScheduled(event: SessionScheduledEvent): Promise<void> {
    this.logger.log(
      `Session ${event.sessionId} scheduled - creating Meet event`,
    );

    try {
      const result = await this.meetingService.createMeetForSession(
        event.sessionId,
        event.title,
      );

      if (result.success) {
        this.logger.log(
          `Meet created for session ${event.sessionId}: ${result.meetLink}`,
        );
      } else {
        this.logger.warn(
          `Failed to create Meet for session ${event.sessionId}: ${result.error}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error creating Meet for session ${event.sessionId}: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  @OnEvent(SessionRescheduledEvent.eventName)
  async handleSessionRescheduled(
    event: SessionRescheduledEvent,
  ): Promise<void> {
    this.logger.log(
      `Session ${event.sessionId} rescheduled - updating Meet event`,
    );

    try {
      const result = await this.meetingService.updateMeetForSession(
        event.sessionId,
        event.newStartAt,
        event.newEndAt,
        event.title,
      );

      if (result.success) {
        this.logger.log(`Meet updated for session ${event.sessionId}`);
      } else {
        this.logger.warn(
          `Failed to update Meet for session ${event.sessionId}: ${result.error}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error updating Meet for session ${event.sessionId}: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  @OnEvent(SessionCanceledEvent.eventName)
  async handleSessionCanceled(event: SessionCanceledEvent): Promise<void> {
    this.logger.log(
      `Session ${event.sessionId} canceled - removing Meet event`,
    );

    try {
      await this.meetingService.cancelMeetForSession(event.sessionId);
      this.logger.log(`Meet canceled for session ${event.sessionId}`);
    } catch (error) {
      this.logger.error(
        `Error canceling Meet for session ${event.sessionId}: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }
}
