import { z } from "zod";
import { Teacher } from "./calendar.js";
import {
  AvailabilityEvent,
  BookingEvent,
  ClassEvent,
  StudentPackageMyCreditsResponse,
} from "@thrive/shared";
import {
  PreviewAvailabilityResponseSchema,
  PublicTeacherSchema,
  PublicTeacherApiSchema,
  PublicTeacherDto,
  LevelDto,
  LevelSchema,
} from "@thrive/shared";

interface SessionWithEnrollmentResponse {
  id: number;
  type: string;
  startAt: string;
  endAt: string;
  capacityMax: number;
  status: string;
  meetingUrl: string | null;
  teacherId: number;
  groupClassId: number | null;
  groupClass: {
    id: number;
    title: string;
    level: LevelDto;
  } | null;
  enrolledCount: number;
  availableSpots: number;
  isFull: boolean;
  canJoinWaitlist: boolean;
  teacher: PublicTeacherDto | null;
}

const options: Partial<RequestInit> = {
  headers: { "Content-Type": "application/json" },
  credentials: "same-origin",
};

export const thriveClient = {
  fetchAvailabilityPreview: async (
    start: Date,
    end: Date,
  ): Promise<AvailabilityEvent[]> => {
    const res = await fetch(`/api/teachers/me/availability/preview`, {
      ...options,
      method: "POST",
      body: JSON.stringify({
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as unknown;
    const parsed = PreviewAvailabilityResponseSchema.parse(raw);
    return parsed.windows.map((w) => ({
      id: `avail:${w.start}|${w.end}`,
      title: "Available",
      startUtc: w.start,
      endUtc: w.end,
      type: "availability",
      teacherIds: [],
    }));
  },

  fetchAvailabilityPublic: async ({
    teacherIds,
    start,
    end,
  }: {
    teacherIds?: number[];
    start: Date;
    end: Date;
  }): Promise<AvailabilityEvent[]> => {
    // TODO: This is searching by userId. I need to make sure that the selected teacher IDs are correct
    const res = await fetch(`/api/teachers/availability/preview`, {
      ...options,
      method: "POST",
      body: JSON.stringify({
        teacherIds,
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as unknown;
    const parsed = PreviewAvailabilityResponseSchema.parse(raw);
    return parsed.windows.map((w) => ({
      id: `avail:${w.start}|${w.end}`,
      title: "Available",
      startUtc: w.start,
      endUtc: w.end,
      type: "availability",
      teacherIds: [],
    }));
  },

  fetchStudentCalendarEvents: async (
    start: Date,
    end: Date,
  ): Promise<BookingEvent[]> => {
    console.trace("Fetching student calendar events:", { start, end });
    const res = await fetch(
      `/api/students/me/sessions?start=${encodeURIComponent(
        start.toISOString(),
      )}&end=${encodeURIComponent(end.toISOString())}`,
      {
        ...options,
        method: "GET",
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as BookingEvent[];
    return Array.isArray(data) ? data : [];
  },

  fetchTeachers: async (): Promise<PublicTeacherDto[]> => {
    try {
      const res = await fetch(`/api/teachers`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        return [];
      }
      const raw = (await res.json()) as unknown;
      console.log("Raw teachers data:", raw);
      // The API sometimes returns a different shape (teacherId, firstName, lastName, name, languagesSpoken, etc.).
      // Try to parse as our PublicTeacherSchema first, otherwise fall back to API schema and map to local Teacher.

      const parsed = z.array(PublicTeacherSchema).parse(raw);
      return parsed;
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      return [];
    }
  },
  fetchTeacher: async (id: number): Promise<Teacher | null> => {
    try {
      const res = await fetch(
        `/api/teachers/${encodeURIComponent(String(id))}`,
        {
          credentials: "same-origin",
        },
      );
      if (!res.ok) return null;
      const raw = (await res.json()) as unknown;
      try {
        const parsed = PublicTeacherSchema.parse(raw);
        return parsed as unknown as Teacher;
      } catch {
        const parsedApi = PublicTeacherApiSchema.parse(raw);
        const mapped: Teacher = {
          userId: parsedApi.userId,
          teacherId: parsedApi.teacherId,
          firstName: parsedApi.firstName || parsedApi.name || "",
          lastName: parsedApi.lastName || "",
          name:
            parsedApi.name ||
            `${parsedApi.firstName || ""} ${parsedApi.lastName || ""}`.trim(),
          bio: parsedApi.bio ?? null,
          avatarUrl: parsedApi.avatarUrl ?? null,
          birthplace: parsedApi.birthplace ?? null,
          currentLocation: parsedApi.currentLocation ?? null,
          specialties: parsedApi.specialties ?? null,
          yearsExperience: parsedApi.yearsExperience ?? null,
          languagesSpoken: parsedApi.languagesSpoken ?? null,
        };
        return mapped;
      }
    } catch (err) {
      console.error("Failed to fetch teacher:", err);
      return null;
    }
  },
  fetchStudentCredits:
    async (): Promise<StudentPackageMyCreditsResponse | null> => {
      try {
        const res = await fetch(`/api/packages/my-credits`, {
          credentials: "same-origin",
        });
        if (!res.ok) return null;
        const data = (await res.json()) as StudentPackageMyCreditsResponse; // {"packages":[{"id":6,"packageName":"5 hour premium package","totalSessions":5,"remainingSessions":4,"purchasedAt":"2025-09-15T18:13:21.250Z","expiresAt":null}],"totalRemaining":4}
        return data;
      } catch (err) {
        console.error("Failed to fetch student credits:", err);
        return null;
      }
    },
  fetchAvailableGroupSessions: async ({
    levelId,
    startDate,
    endDate,
    teacherId,
  }: {
    levelId?: number;
    startDate?: Date;
    endDate?: Date;
    teacherId?: number;
  } = {}): Promise<ClassEvent[]> => {
    try {
      const params = new URLSearchParams();
      if (levelId) params.append("levelId", String(levelId));
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());
      if (teacherId) params.append("teacherId", String(teacherId));

      const res = await fetch(
        `/api/group-classes/available?${params.toString()}`,
        {
          credentials: "same-origin",
        },
      );
      if (!res.ok) return [];
      const sessions = (await res.json()) as SessionWithEnrollmentResponse[];
      if (!Array.isArray(sessions)) return [];

      // Map to CalendarEvent format
      return sessions.map((s) => {
        // Transform teacher object to include name from user relation
        const teacher = s.teacher;

        return {
          id: `group-session-${s.id}`,
          type: "class" as const,
          serviceType: "GROUP" as const,
          title: s.groupClass.title,
          startUtc: s.startAt,
          endUtc: s.endAt,
          sessionId: String(s.id),
          groupClassId: s.groupClass.id,
          level: s.groupClass.level,
          teacher,
          capacityMax: s.capacityMax,
          enrolledCount: s.enrolledCount,
          availableSpots: s.availableSpots,
          isFull: s.isFull,
          canJoinWaitlist: s.canJoinWaitlist,
          meetingUrl: s.meetingUrl || undefined,
          status: "SCHEDULED" as const,
        };
      });
    } catch (err) {
      console.error("Failed to fetch available group sessions:", err);
      return [];
    }
  },
  fetchLevels: async (): Promise<LevelDto[]> => {
    try {
      const res = await fetch(`/api/levels`, {
        credentials: "same-origin",
      });
      if (!res.ok) return [];
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) {
        throw new Error("Invalid levels data");
      }
      const levels = (data as LevelDto[]).map((level) =>
        LevelSchema.parse(level),
      );
      return levels;
    } catch (err) {
      console.error("Failed to fetch levels:", err);
      return [];
    }
  },
} as const;
