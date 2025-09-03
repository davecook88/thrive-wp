import { BaseCalendarEvent } from "@/types/calendar";

const options: Partial<RequestInit> = {
  headers: { "Content-Type": "application/json" },
  credentials: "same-origin",
};

export const thriveClient = {
  fetchAvailabilityPreview: async (
    start: Date,
    end: Date
  ): Promise<BaseCalendarEvent[]> => {
    const res = await fetch(`/api/teachers/me/availability/preview`, {
      ...options,
      body: JSON.stringify({
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      windows?: Array<{ start: string; end: string }>;
    };
    const wins = Array.isArray(data?.windows) ? data.windows : [];
    return wins.map((w) => ({
      id: `avail:${w.start}|${w.end}`,
      title: "Available",
      startUtc: w.start,
      endUtc: w.end,
      type: "availability",
    }));
  },
} as const;
