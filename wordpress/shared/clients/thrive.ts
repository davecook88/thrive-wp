/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {
  AvailabilityEvent,
  ClassEvent,
  BookingEvent,
  Teacher,
  Level,
} from "../types/calendar";
import { StudentPackageMyCreditsResponse } from "../types/packages";

const options: Partial<RequestInit> = {
  headers: { "Content-Type": "application/json" },
  credentials: "same-origin",
};

export const thriveClient = {
  fetchAvailabilityPreview: async (
    start: Date,
    end: Date,
  ): Promise<AvailabilityEvent[]> => {
    console.trace("Fetching availability preview:", { start, end });
    const res = await fetch(`/api/teachers/me/availability/preview`, {
      ...options,
      method: "POST",
      body: JSON.stringify({
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      windows?: Array<{ start: string; end: string; teacherIds: number[] }>;
    };
    const wins = Array.isArray(data?.windows) ? data.windows : [];
    return wins.map((w) => ({
      id: `avail:${w.start}|${w.end}`,
      title: "Available",
      startUtc: w.start,
      endUtc: w.end,
      type: "availability",
      teacherIds: w.teacherIds,
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
    const data = (await res.json()) as {
      windows?: Array<{ start: string; end: string; teacherIds: number[] }>;
    };
    const wins = Array.isArray(data?.windows) ? data.windows : [];
    return wins.map((w) => ({
      id: `avail:${w.start}|${w.end}`,
      title: "Available",
      startUtc: w.start,
      endUtc: w.end,
      type: "availability",
      teacherIds: w.teacherIds,
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

  fetchTeachers: async () => {
    try {
      const res = await fetch(`/api/teachers`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as Teacher[];
      return data;
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
      const data = (await res.json()) as Teacher;
      return data;
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
      const sessions = (await res.json()) as unknown[];
      if (!Array.isArray(sessions)) return [];

      // Map to CalendarEvent format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return sessions.map((s: any) => {
        // Transform teacher object to include name from user relation
        const teacher = s.teacher
          ? {
              ...s.teacher,
              name:
                s.teacher.user?.firstName && s.teacher.user?.lastName
                  ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}`.trim()
                  : s.teacher.user?.firstName ||
                    s.teacher.user?.lastName ||
                    `Teacher #${s.teacher.userId}`,
              firstName: s.teacher.user?.firstName,
              lastName: s.teacher.user?.lastName,
              teacherId: s.teacher.id,
            }
          : undefined;

        return {
          id: `group-session-${s.id}`,
          type: "class" as const,
          serviceType: "GROUP" as const,
          title: s.groupClass.title,
          startUtc: s.startAt,
          endUtc: s.endAt,
          sessionId: s.id,
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
  fetchLevels: async (): Promise<Level[]> => {
    try {
      const res = await fetch(`/api/levels`, {
        credentials: "same-origin",
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { levels?: Level[] };
      const levels = Array.isArray(data?.levels) ? data.levels : [];
      return levels;
    } catch (err) {
      console.error("Failed to fetch levels:", err);
      return [];
    }
  },
} as const;
