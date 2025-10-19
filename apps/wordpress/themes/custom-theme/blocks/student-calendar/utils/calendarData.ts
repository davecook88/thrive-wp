import type {
  BaseCalendarEvent,
  BookingEvent,
} from "@thrive/shared/calendar";
import { thriveClient } from "../../../../../shared/thrive";

export const fetchStudentBookings = async (
  start: Date,
  end: Date,
): Promise<BookingEvent[]> => {
  return await thriveClient.fetchStudentCalendarEvents(start, end);
};

export const fetchAvailableGroupSessions = async (
  start: Date,
  end: Date,
  filters?: { levelId?: number; teacherId?: number },
): Promise<BaseCalendarEvent[]> => {
  return await thriveClient.fetchAvailableGroupSessions({
    startDate: start,
    endDate: end,
    levelId: filters?.levelId,
    teacherId: filters?.teacherId,
  });
};
