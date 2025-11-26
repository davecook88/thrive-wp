import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { Repository } from "typeorm";
import { MeetingService } from "../services/meeting.service.js";
import { GoogleAuthService } from "../services/google-auth.service.js";
import {
  SessionMeetEvent,
  MeetEventStatus,
} from "../entities/session-meet-event.entity.js";
import {
  Session,
  SessionStatus,
} from "../../sessions/entities/session.entity.js";
import { ServiceType } from "../../common/types/class-types.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("MeetingService", () => {
  let service: MeetingService;
  let googleAuthService: GoogleAuthService;
  let meetEventRepo: Repository<SessionMeetEvent>;
  let sessionRepo: Repository<Session>;

  const mockSession: Partial<Session> = {
    id: 1,
    teacherId: 100,
    startAt: new Date("2025-01-15T10:00:00Z"),
    endAt: new Date("2025-01-15T11:00:00Z"),
    status: SessionStatus.SCHEDULED,
    type: ServiceType.PRIVATE,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    googleAuthService = {
      getAccessToken: vi.fn(),
    } as unknown as GoogleAuthService;

    meetEventRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    } as unknown as Repository<SessionMeetEvent>;

    sessionRepo = {
      findOne: vi.fn(),
      save: vi.fn(),
    } as unknown as Repository<Session>;

    service = new MeetingService(googleAuthService, meetEventRepo, sessionRepo);
  });

  describe("createMeetForSession", () => {
    it("should return error when session not found", async () => {
      (sessionRepo.findOne as Mock).mockResolvedValue(null);

      const result = await service.createMeetForSession(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Session not found");
    });

    it("should return error when teacher not connected", async () => {
      (sessionRepo.findOne as Mock).mockResolvedValue(mockSession);
      (meetEventRepo.findOne as Mock).mockResolvedValue(null);
      (meetEventRepo.create as Mock).mockImplementation(
        (d: Partial<SessionMeetEvent>) => d,
      );
      (meetEventRepo.save as Mock).mockImplementation((d: SessionMeetEvent) =>
        Promise.resolve({ id: 1, ...d }),
      );
      (googleAuthService.getAccessToken as Mock).mockResolvedValue(null);

      const result = await service.createMeetForSession(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Teacher has not connected Google Calendar");
    });

    it("should return existing meet link if already ready", async () => {
      (sessionRepo.findOne as Mock).mockResolvedValue(mockSession);
      (meetEventRepo.findOne as Mock).mockResolvedValue({
        sessionId: 1,
        status: MeetEventStatus.READY,
        hangoutLink: "https://meet.google.com/abc-defg-hij",
        googleEventId: "event123",
      });

      const result = await service.createMeetForSession(1);

      expect(result.success).toBe(true);
      expect(result.meetLink).toBe("https://meet.google.com/abc-defg-hij");
    });

    it("should create meet via Google Calendar API", async () => {
      (sessionRepo.findOne as Mock).mockResolvedValue(mockSession);
      (meetEventRepo.findOne as Mock).mockResolvedValue(null);
      (meetEventRepo.create as Mock).mockImplementation(
        (d: Partial<SessionMeetEvent>) => d,
      );
      (meetEventRepo.save as Mock).mockImplementation((d: SessionMeetEvent) =>
        Promise.resolve({ id: 1, ...d }),
      );
      (googleAuthService.getAccessToken as Mock).mockResolvedValue(
        "valid-access-token",
      );
      (sessionRepo.save as Mock).mockImplementation((s: Session) =>
        Promise.resolve(s),
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "calendar-event-id",
            hangoutLink: "https://meet.google.com/xyz-abcd-efg",
          }),
      });

      const result = await service.createMeetForSession(1, "Test Session");

      expect(result.success).toBe(true);
      expect(result.eventId).toBe("calendar-event-id");
      expect(result.meetLink).toBe("https://meet.google.com/xyz-abcd-efg");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("calendar/v3/calendars/primary/events"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer valid-access-token",
          }),
        }),
      );
    });
  });

  describe("getMeetInfo", () => {
    it("should return null when no meet event exists", async () => {
      (meetEventRepo.findOne as Mock).mockResolvedValue(null);

      const result = await service.getMeetInfo(999);

      expect(result).toBeNull();
    });

    it("should return meet info when event exists", async () => {
      (meetEventRepo.findOne as Mock).mockResolvedValue({
        sessionId: 1,
        googleEventId: "event123",
        hangoutLink: "https://meet.google.com/abc-defg-hij",
        status: MeetEventStatus.READY,
      });

      const result = await service.getMeetInfo(1);

      expect(result).toEqual({
        meetLink: "https://meet.google.com/abc-defg-hij",
        meetEventId: "event123",
        meetStatus: MeetEventStatus.READY,
      });
    });
  });

  describe("cancelMeetForSession", () => {
    it("should do nothing when no meet event exists", async () => {
      (meetEventRepo.findOne as Mock).mockResolvedValue(null);

      await service.cancelMeetForSession(999);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should cancel the Google Calendar event", async () => {
      (meetEventRepo.findOne as Mock).mockResolvedValue({
        sessionId: 1,
        googleEventId: "event123",
        status: MeetEventStatus.READY,
      });
      (sessionRepo.findOne as Mock).mockResolvedValue(mockSession);
      (googleAuthService.getAccessToken as Mock).mockResolvedValue(
        "valid-access-token",
      );
      (meetEventRepo.save as Mock).mockImplementation((d: SessionMeetEvent) =>
        Promise.resolve(d),
      );

      mockFetch.mockResolvedValueOnce({ ok: true });

      await service.cancelMeetForSession(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("events/event123"),
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(meetEventRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MeetEventStatus.CANCELED,
        }),
      );
    });
  });

  describe("retryMeetCreation", () => {
    it("should throw when meet event not found", async () => {
      (meetEventRepo.findOne as Mock).mockResolvedValue(null);

      await expect(service.retryMeetCreation(999)).rejects.toThrow(
        "No meet event found for session 999",
      );
    });

    it("should reset retry count and recreate", async () => {
      (meetEventRepo.findOne as Mock)
        .mockResolvedValueOnce({
          sessionId: 1,
          status: MeetEventStatus.ERROR,
          retryCount: 3,
        })
        .mockResolvedValueOnce(null); // For createMeetForSession

      (meetEventRepo.save as Mock).mockImplementation((d: SessionMeetEvent) =>
        Promise.resolve({ id: 1, ...d }),
      );
      (meetEventRepo.create as Mock).mockImplementation(
        (d: Partial<SessionMeetEvent>) => d,
      );
      (sessionRepo.findOne as Mock).mockResolvedValue(mockSession);
      (googleAuthService.getAccessToken as Mock).mockResolvedValue(null);

      await service.retryMeetCreation(1);

      expect(meetEventRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          retryCount: 0,
          status: MeetEventStatus.PENDING,
        }),
      );
    });
  });
});
