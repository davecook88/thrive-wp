import { useEffect, useRef } from "@wordpress/element";
import type {
  BaseCalendarEvent,
  ThriveCalendarElement,
} from "../../../types/calendar";
import { useCalendarEvents } from "../../hooks/use-calendar-events";
import { thriveClient } from "../../../clients/thrive";

interface StudentCalendarProps {
  view: "week" | "day" | "month" | "list";
  slotDuration: number;
  snapTo: number;
  viewHeight: number;
}

export default function StudentCalendar({
  view,
  slotDuration,
  snapTo,
  viewHeight,
}: StudentCalendarProps) {
  const calendarRef = useRef<ThriveCalendarElement>(null);
  const { setEventsFunc, events, fetchEvents } = useCalendarEvents();
  useEffect(() => {
    const eventsFunc = async (start: Date, end: Date) => {
      return thriveClient.fetchStudentCalendarEvents(start, end);
    };
    setEventsFunc(eventsFunc);
  }, [setEventsFunc]);

  useEffect(() => {
    const calendar = calendarRef.current;
    if (calendar) {
      calendar.events = events as BaseCalendarEvent[];
    }
  }, [events]);

  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

    console.log("Student Calendar: Attaching to calendar element", calendar);

    // Wire up basic event handlers
    const handleEventClick = (e: any) => {
      const event = e?.detail?.event;
      if (event) {
        console.log("Student Calendar: Event clicked", event);
        // Could dispatch custom event for modal handling if needed
      }
    };

    const handleToday = () => {
      console.log("Student Calendar: Today button clicked");
    };

    const handleNavigate = (e: any) => {
      const dir = e?.detail?.direction === "next" ? "next" : "prev";
      console.log("Student Calendar: Navigate", dir);
    };

    const handleSetView = (e: any) => {
      const v = e?.detail?.view as any;
      if (v) {
        console.log("Student Calendar: Set view", v);
      }
    };

    const handleRangeChange = (e: any) => {
      const detail = e?.detail as { fromDate?: string; untilDate?: string };
      if (detail?.fromDate && detail?.untilDate) {
        fetchEvents(new Date(detail.fromDate), new Date(detail.untilDate));
      }
    };

    // Add event listeners
    calendar.addEventListener("event:click", handleEventClick);
    calendar.addEventListener("today", handleToday);
    calendar.addEventListener("navigate", handleNavigate);
    calendar.addEventListener("set-view", handleSetView);
    calendar.addEventListener("range:change", handleRangeChange);

    // Cleanup function
    return () => {
      calendar.removeEventListener("event:click", handleEventClick);
      calendar.removeEventListener("today", handleToday);
      calendar.removeEventListener("navigate", handleNavigate);
      calendar.removeEventListener("set-view", handleSetView);
      calendar.removeEventListener("range:change", handleRangeChange);
    };
  }, []);

  return (
    <div
      className="student-calendar-wrapper"
      style={{ height: "100%", width: "100%" }}
    >
      <thrive-calendar
        ref={calendarRef}
        view={view}
        mode="student"
        slot-duration={slotDuration.toString()}
        snap-to={snapTo.toString()}
        show-classes="true"
        show-availability="false"
        show-bookings="true"
        view-height={viewHeight.toString()}
      />
    </div>
  );
}
