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
