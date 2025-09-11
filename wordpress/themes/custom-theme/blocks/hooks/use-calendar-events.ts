import { useRef, useState } from "@wordpress/element";
import { CalendarEvent } from "../../types/calendar";

export type fetchEventsFunc = (
  start: Date,
  end: Date
) => Promise<CalendarEvent[]>;

export const useCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const eventsFuncRef = useRef<fetchEventsFunc | null>(null);
  const setEventsFunc = (func: fetchEventsFunc) => {
    eventsFuncRef.current = func;
  };

  //   const [eventsFunc, setEventsFunc] = useState<fetchEventsFunc | null>(null);

  const fetchEvents = async (start: Date, end: Date) => {
    for (const d of [start, end]) {
      if (!(d instanceof Date) || isNaN(d.getTime())) {
        console.warn("Invalid date provided to fetchEvents:", d);
        return [];
      }
    }
    if (!start || !end) return [];
    // if events within date range already loaded, return those
    const loadedEvents = events.filter(
      (e) => e.startUtc >= start.toISOString() && e.endUtc <= end.toISOString()
    );
    if (loadedEvents.length > 0) {
      return loadedEvents;
    }

    // otherwise, fetch new events using the provided function
    if (eventsFuncRef.current) {
      const newEvents = await eventsFuncRef.current(start, end);
      setEvents((prev) => [...prev, ...newEvents]);
      return newEvents;
    } else {
      console.warn("No events function provided to fetch events");
    }

    return [];
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return {
    events,
    setEvents,
    setEventsFunc,
    fetchEvents,
    clearEvents,
  };
};
