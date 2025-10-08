import type {
  BaseCalendarEvent,
  AvailabilityEvent,
} from "../../../types/calendar";
import { thriveClient } from "../../../clients/thrive";

export const fetchStudentBookings = async (
  start: Date,
  end: Date
): Promise<BaseCalendarEvent[]> => {
  return await thriveClient.fetchStudentCalendarEvents(start, end);
};

export const fetchAvailabilitySlots = async (
  start: Date,
  end: Date,
  selectedTeacherIds: number[],
  sessionDuration: number,
  slotDuration: number
): Promise<AvailabilityEvent[]> => {
  if (selectedTeacherIds.length === 0 || end < new Date()) {
    return [];
  }

  const avail = await thriveClient.fetchAvailabilityPublic({
    start,
    end,
    teacherIds: selectedTeacherIds.length ? selectedTeacherIds : undefined,
  });

  // Chunk windows into session-sized availability events
  const sessionMinutes = sessionDuration;
  const chunks: AvailabilityEvent[] = avail.flatMap((w) => {
    const winStart = new Date(w.startUtc);
    const winEnd = new Date(w.endUtc);
    const out: AvailabilityEvent[] = [];
    let current = new Date(winStart);

    while (current < winEnd) {
      const sessionEnd = new Date(
        current.getTime() + sessionMinutes * 60 * 1000
      );

      if (sessionEnd <= winEnd) {
        out.push({
          id: `avail:${current.toISOString()}|${sessionEnd.toISOString()}`,
          title: "Available",
          startUtc: current.toISOString(),
          endUtc: sessionEnd.toISOString(),
          type: "availability",
          teacherIds: w.teacherIds,
        });
      }

      current = new Date(
        current.getTime() + Math.max(5, slotDuration || 30) * 60 * 1000
      );
    }
    return out;
  });

  // Filter chunks in the past
  const now = new Date();
  return chunks.filter((e) => new Date(e.endUtc) >= now);
};
