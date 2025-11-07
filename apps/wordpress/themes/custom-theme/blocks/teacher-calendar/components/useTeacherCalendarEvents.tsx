import { useCallback, useEffect, useState } from "react";
import type { BaseCalendarEvent } from "@thrive/shared/calendar";
import { CalendarMode } from "./types";
import { thriveClient } from "../../../../../shared/thrive";

export const useTeacherCalendarEvents = (mode: CalendarMode) => {
  const [events, setEvents] = useState<BaseCalendarEvent[]>([]);
  const [currentRange, setCurrentRange] = useState<{
    from: Date;
    until: Date;
  } | null>(null);

  const updateClasses = useCallback(async (start: Date, end: Date) => {
    const sessions = await thriveClient.fetchTeacherSessions(start, end);
    const calendarEvents: BaseCalendarEvent[] =
      sessions?.map((session) => ({
        id: `session-${session.id}`,
        title: `Class with ${session.student_name}`,
        startUtc: session.start_at,
        endUtc: session.end_at,
        type: "booking" as const,
        studentId: String(session.student_id),
        description: `${session.class_type} class`,
      })) ?? [];
    return calendarEvents;
  }, []);

  const updateEvents = useCallback(async () => {
    if (!currentRange) return;
    const start = currentRange.from;
    const end = currentRange.until;
    let calendarEvents: BaseCalendarEvent[] = [];
    if (mode === "classes") {
      // Fetch teacher's scheduled classes using thriveClient
      try {
        calendarEvents = await updateClasses(start, end);
      } catch (error) {
        console.error("Failed to load teacher sessions:", error);
      }
    } else {
      // Fetch teacher's availability windows
      try {
        calendarEvents = await thriveClient.fetchAvailabilityPreview(
          start,
          end,
        );
        setEvents(calendarEvents);
      } catch (error) {
        console.error("Failed to load availability preview:", error);
      } finally {
        setEvents(calendarEvents);
      }
    }
  }, [currentRange, mode]);

  useEffect(() => {
    void updateEvents();
  }, [updateEvents]);

  return {
    events,
    setEvents,
    currentRange,
    setCurrentRange,
    updateEvents,
  };
};
