import { useEffect, useRef, useState } from "@wordpress/element";
import type {
  BaseCalendarEvent,
  ThriveCalendarElement,
} from "../../../types/calendar";

interface TeacherCalendarProps {
  view: "week" | "day" | "month" | "list";
  slotDuration: number;
  snapTo: number;
  viewHeight: number;
}

type CalendarMode = "availability" | "classes";

export default function TeacherCalendar({
  view,
  slotDuration,
  snapTo,
  viewHeight,
}: TeacherCalendarProps) {
  const calendarRef = useRef<ThriveCalendarElement>(null);
  const [mode, setMode] = useState<CalendarMode>("classes");
  const [events, setEvents] = useState<BaseCalendarEvent[]>([]);
  const [currentRange, setCurrentRange] = useState<{
    from: Date;
    until: Date;
  } | null>(null);

  // Fetch data based on current mode and range
  const fetchData = async (start: Date, end: Date) => {
    if (mode === "classes") {
      // Fetch teacher's scheduled classes
      const response = await fetch(
        `/api/teachers/me/sessions?start=${start.toISOString()}&end=${end.toISOString()}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const sessions = await response.json();
        const calendarEvents: BaseCalendarEvent[] = sessions.map(
          (session: any) => ({
            id: `session-${session.id}`,
            title: `Class with ${session.studentName}`,
            start: new Date(session.startAt).toISOString(),
            end: new Date(session.endAt).toISOString(),
            type: "booking" as const,
            bookingId: session.id,
            studentName: session.studentName,
            classType: session.classType,
          })
        );
        setEvents(calendarEvents);
      }
    } else {
      // Fetch teacher's availability windows
      const response = await fetch(
        `/api/teachers/me/availability/preview?start=${start.toISOString()}&end=${end.toISOString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            start: start.toISOString(),
            end: end.toISOString(),
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const availabilityEvents: BaseCalendarEvent[] = data.windows.map(
          (window: any, index: number) => ({
            id: `availability-${index}`,
            title: "Available",
            start: window.start,
            end: window.end,
            type: "availability" as const,
          })
        );
        setEvents(availabilityEvents);
      }
    }
  };

  // Refetch when mode changes
  useEffect(() => {
    if (currentRange) {
      fetchData(currentRange.from, currentRange.until);
    }
  }, [mode]);

  // Push events to calendar element
  useEffect(() => {
    const calendar = calendarRef.current;
    if (calendar) {
      calendar.events = events as BaseCalendarEvent[];
    }
  }, [events]);

  // Handle calendar events
  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

    const handleEventClick = (e: any) => {
      const event = e?.detail?.event;
      if (event && event.type === "booking") {
        // Show booking details modal or navigate to booking details
        console.log("Booking clicked:", event);
      }
    };

    const handleRangeChange = (e: any) => {
      const detail = e?.detail as { fromDate?: string; untilDate?: string };
      if (detail?.fromDate && detail?.untilDate) {
        const from = new Date(detail.fromDate);
        const until = new Date(detail.untilDate);
        setCurrentRange({ from, until });
        fetchData(from, until);
      }
    };

    const handleRefreshCalendar = () => {
      if (currentRange) {
        fetchData(currentRange.from, currentRange.until);
      }
    };

    calendar.addEventListener("event:click", handleEventClick);
    calendar.addEventListener("range:change", handleRangeChange);
    document.addEventListener(
      "thrive:refresh-calendar-data",
      handleRefreshCalendar
    );

    return () => {
      calendar.removeEventListener("event:click", handleEventClick);
      calendar.removeEventListener("range:change", handleRangeChange);
      document.removeEventListener(
        "thrive:refresh-calendar-data",
        handleRefreshCalendar
      );
    };
  }, [currentRange]);

  return (
    <div
      className="teacher-calendar-wrapper"
      style={{ height: "100%", width: "100%" }}
    >
      {/* Mode Toggle Header */}
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          background:
            mode === "classes"
              ? "var(--wp--preset--color--gray-50)"
              : "var(--wp--preset--color--accent-light, #f0fdf4)",
          borderRadius: 12,
          border: "2px solid",
          borderColor:
            mode === "classes"
              ? "var(--wp--preset--color--gray-200)"
              : "var(--wp--preset--color--accent, #10b981)",
          transition: "all 200ms ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              background: "white",
              borderRadius: 8,
              padding: 4,
              gap: 4,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <button
              type="button"
              onClick={() => setMode("classes")}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                background:
                  mode === "classes"
                    ? "var(--wp--preset--color--accent, #3b82f6)"
                    : "transparent",
                color:
                  mode === "classes"
                    ? "white"
                    : "var(--wp--preset--color--gray-700)",
                transition: "all 150ms ease",
              }}
            >
              My Classes
            </button>
            <button
              type="button"
              onClick={() => setMode("availability")}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                background:
                  mode === "availability"
                    ? "var(--wp--preset--color--accent, #10b981)"
                    : "transparent",
                color:
                  mode === "availability"
                    ? "white"
                    : "var(--wp--preset--color--gray-700)",
                transition: "all 150ms ease",
              }}
            >
              Set Availability
            </button>
          </div>

          {/* Mode indicator badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 6,
              background:
                mode === "classes"
                  ? "var(--wp--preset--color--gray-100)"
                  : "var(--wp--preset--color--accent, #10b981)",
              color: mode === "classes" ? "#374151" : "white",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {mode === "classes" ? (
              <>Viewing your scheduled classes</>
            ) : (
              <>Managing your availability</>
            )}
          </div>
        </div>

        {/* Availability mode message */}
        {mode === "availability" && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "white",
              borderRadius: 8,
              fontSize: 14,
              color: "#374151",
            }}
          >
            <p style={{ margin: 0 }}>
              <strong>Note:</strong> To edit your availability rules and
              exceptions,{" "}
              <a href="/teacher/set-availability" style={{ color: "#10b981" }}>
                visit the availability settings page
              </a>
              . This calendar shows your current availability windows.
            </p>
          </div>
        )}
      </div>

      {/* Calendar Component */}
      <thrive-calendar
        ref={calendarRef}
        view={view}
        mode="student"
        slot-duration={slotDuration.toString()}
        snap-to={snapTo.toString()}
        show-classes="true"
        show-availability={mode === "availability" ? "true" : "false"}
        show-bookings={mode === "classes" ? "true" : "false"}
        view-height={viewHeight.toString()}
        event-availability-bg="#10b981"
        event-availability-fg="white"
        event-booking-bg="#3b82f6"
        event-booking-fg="white"
      />
    </div>
  );
}
