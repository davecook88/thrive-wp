import { useEffect, useRef, useState } from "@wordpress/element";
import type {
  BaseCalendarEvent,
  ThriveCalendarElement,
  CalendarEventClickEvent,
  CalendarRangeChangeEvent,
} from "../../../../../shared/types/calendar";
import { isBookingEvent } from "../../../../../shared/types/calendar";
import RulesSection from "../../teacher-availability/components/RulesSection";
import ExceptionsSection from "../../teacher-availability/components/ExceptionsSection";

interface TeacherCalendarProps {
  view: "week" | "day" | "month" | "list";
  slotDuration: number;
  snapTo: number;
  viewHeight: number;
}

type CalendarMode = "availability" | "classes";

interface Rule {
  id?: string;
  weekday: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  kind: string;
}

interface Exception {
  id?: string;
  date: string;
  kind: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
}

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

  // Availability management state
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Fetch data based on current mode and range
  const fetchData = async (start: Date, end: Date) => {
    if (mode === "classes") {
      // Fetch teacher's scheduled classes
      const response = await fetch(
        `/api/teachers/me/sessions?start=${start.toISOString()}&end=${end.toISOString()}`,
        {
          credentials: "include",
        },
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
          }),
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
        },
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
          }),
        );
        setEvents(availabilityEvents);
      }
    }
  };

  // Load availability rules and exceptions
  const loadAvailability = async () => {
    try {
      setAvailabilityLoading(true);
      const response = await fetch("/api/teachers/me/availability", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const toMinutes = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        };

        const mappedRules: Rule[] = (data.rules || []).map((r: any) => ({
          id: String(r.id),
          weekday: String(r.weekday),
          startTimeMinutes: toMinutes(r.startTime),
          endTimeMinutes: toMinutes(r.endTime),
          kind: "available",
        }));

        const mappedExceptions: Exception[] = (data.exceptions || []).map(
          (e: any) => ({
            id: String(e.id),
            date: e.date,
            kind: e.isBlackout ? "unavailable" : "available",
            startTimeMinutes: e.startTime ? toMinutes(e.startTime) : undefined,
            endTimeMinutes: e.endTime ? toMinutes(e.endTime) : undefined,
          }),
        );

        setRules(mappedRules);
        setExceptions(mappedExceptions);
      }
    } catch (error) {
      console.error("Failed to load availability:", error);
      setRules([]);
      setExceptions([]);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Persist availability changes
  const persistAvailability = async (
    nextRules: Rule[],
    nextExceptions: Exception[],
  ) => {
    const toTime = (mins: number) => {
      const normalizedMins = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
      const utcHours = Math.floor(normalizedMins / 60);
      const utcMinutes = ((normalizedMins % 60) + 60) % 60;
      return `${utcHours.toString().padStart(2, "0")}:${utcMinutes
        .toString()
        .padStart(2, "0")}`;
    };

    const payload = {
      rules: nextRules.map((r) => ({
        weekday: Number(r.weekday),
        startTime: toTime(r.startTimeMinutes),
        endTime: toTime(r.endTimeMinutes),
      })),
      exceptions: nextExceptions
        .filter((e) => e.kind === "unavailable")
        .map((e) => ({
          date: e.date,
          startTime:
            typeof e.startTimeMinutes === "number"
              ? toTime(e.startTimeMinutes)
              : undefined,
          endTime:
            typeof e.endTimeMinutes === "number"
              ? toTime(e.endTimeMinutes)
              : undefined,
          isBlackout: true,
        })),
    };

    await fetch("/api/teachers/me/availability", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    await loadAvailability();

    // Refresh calendar preview
    if (currentRange) {
      fetchData(currentRange.from, currentRange.until);
    }
  };

  // Availability handlers
  const handleAddRule = async (rule: Omit<Rule, "id">) => {
    try {
      const next = [...rules, rule];
      setRules(next);
      await persistAvailability(next, exceptions);
    } catch (error) {
      console.error("Error adding rule:", error);
      alert("Failed to add rule: " + (error as Error).message);
    }
  };

  const handleRemoveRule = async (index: number) => {
    const rule = rules[index];
    if (!rule || !rule.id) {
      setRules(rules.filter((_, i) => i !== index));
      return;
    }

    try {
      const next = rules.filter((_, i) => i !== index);
      setRules(next);
      await persistAvailability(next, exceptions);
    } catch (error) {
      console.error("Error removing rule:", error);
      alert("Failed to remove rule: " + (error as Error).message);
    }
  };

  const handleAddException = async (exception: Omit<Exception, "id">) => {
    if (exception.kind !== "unavailable") {
      alert("Custom availability exceptions are not supported yet.");
      return;
    }
    try {
      const next = [...exceptions, exception];
      setExceptions(next);
      await persistAvailability(rules, next);
    } catch (error) {
      console.error("Error adding exception:", error);
      alert("Failed to add exception: " + (error as Error).message);
    }
  };

  const handleRemoveException = async (index: number) => {
    const exception = exceptions[index];
    if (!exception || !exception.id) {
      setExceptions(exceptions.filter((_, i) => i !== index));
      return;
    }

    try {
      const next = exceptions.filter((_, i) => i !== index);
      setExceptions(next);
      await persistAvailability(rules, next);
    } catch (error) {
      console.error("Error removing exception:", error);
      alert("Failed to remove exception: " + (error as Error).message);
    }
  };

  // Refetch when mode changes
  useEffect(() => {
    if (mode === "availability") {
      loadAvailability();
    }
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

    const handleEventClick = (e: CalendarEventClickEvent) => {
      const event = e.detail.event;
      if (event && isBookingEvent(event)) {
        // Show booking details modal or navigate to booking details
        console.log("Booking clicked:", event);
      }
    };

    const handleRangeChange = (e: CalendarRangeChangeEvent) => {
      const detail = e.detail;
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
      handleRefreshCalendar,
    );

    return () => {
      calendar.removeEventListener("event:click", handleEventClick);
      calendar.removeEventListener("range:change", handleRangeChange);
      document.removeEventListener(
        "thrive:refresh-calendar-data",
        handleRefreshCalendar,
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
              <strong>Set your availability:</strong> Configure your weekly
              rules and date-specific exceptions below. The calendar will update
              automatically to show your availability windows.
            </p>
          </div>
        )}
      </div>

      {/* Availability Controls - shown inline when in availability mode */}
      {mode === "availability" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          {availabilityLoading ? (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "2rem",
                color: "#6b7280",
              }}
            >
              Loading availability settings...
            </div>
          ) : (
            <>
              <RulesSection
                rules={rules}
                onAddRule={handleAddRule}
                onRemoveRule={handleRemoveRule}
                accentColor="#10b981"
              />
              <ExceptionsSection
                exceptions={exceptions}
                onAddException={handleAddException}
                onRemoveException={handleRemoveException}
                accentColor="#10b981"
              />
            </>
          )}
        </div>
      )}

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
