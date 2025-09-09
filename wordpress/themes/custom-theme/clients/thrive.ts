import {
  AvailabilityEvent,
  BaseCalendarEvent,
  Teacher,
} from "../types/calendar";

const options: Partial<RequestInit> = {
  headers: { "Content-Type": "application/json" },
  credentials: "same-origin",
};

export const thriveClient = {
  fetchAvailabilityPreview: async (
    start: Date,
    end: Date
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
        }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Teacher;
      return data;
    } catch (err) {
      console.error("Failed to fetch teacher:", err);
      return null;
    }
  },
} as const;
