import { useEffect, useRef, useState } from "@wordpress/element";
import type { BaseCalendarEvent } from "@thrive/shared/calendar";
import { isBookingEvent } from "@thrive/shared/calendar";
import RulesSection from "./RulesSection";
import ExceptionsSection from "./ExceptionsSection";
import { thriveClient } from "../../../../../shared/thrive";
import {
  CalendarEventClickEvent,
  CalendarRangeChangeEvent,
  ThriveCalendarElement,
} from "../../../../../shared/calendar";
import {
  AvailabilityException,
  UpdateAvailabilityDto,
  WeeklyAvailabilityRule,
} from "@thrive/shared";

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

  // Availability management state
  const [rules, setRules] = useState<WeeklyAvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Fetch data based on current mode and range
  const fetchData = async (start: Date, end: Date) => {
    if (mode === "classes") {
      // Fetch teacher's scheduled classes using thriveClient
      try {
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
        setEvents(calendarEvents);
      } catch (error) {
        console.error("Failed to load teacher sessions:", error);
        setEvents([]);
      }
    } else {
      // Fetch teacher's availability windows
      try {
        const availabilityEvents = await thriveClient.fetchAvailabilityPreview(
          start,
          end,
        );
        setEvents(availabilityEvents);
      } catch (error) {
        console.error("Failed to load availability preview:", error);
        setEvents([]);
      }
    }
  };

  // Load availability rules and exceptions
  const loadAvailability = async () => {
    try {
      setAvailabilityLoading(true);
      const data = await thriveClient.getTeacherAvailability();

      if (data) {
        const mappedExceptions: AvailabilityException[] = (
          data.exceptions || []
        ).map((e) => ({
          id: e.id,
          date: e.date,
          isBlackout: e.isBlackout,
          startTimeMinutes: undefined,
          endTimeMinutes: undefined,
        }));

        setRules(data.rules || []);
        setExceptions(mappedExceptions);
      } else {
        setRules([]);
        setExceptions([]);
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
    nextRules: WeeklyAvailabilityRule[],
    nextExceptions: AvailabilityException[],
  ) => {
    const payload: UpdateAvailabilityDto = {
      rules: nextRules.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
      })),
      exceptions: nextExceptions
        .filter((e) => e.isBlackout)
        .map((e) => ({
          date: e.date,
          isBlackout: true,
        })),
    };

    await thriveClient.updateTeacherAvailability(payload);
    await loadAvailability();

    // Refresh calendar preview
    if (currentRange) {
      void fetchData(currentRange.from, currentRange.until);
    }
  };

  // Availability handlers
  const handleAddRule = async (rule: Omit<WeeklyAvailabilityRule, "id">) => {
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

  const handleAddException = async (
    exception: Omit<AvailabilityException, "id">,
  ) => {
    if (exception.isBlackout !== true) {
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
      void loadAvailability();
    }
    if (currentRange) {
      void fetchData(currentRange.from, currentRange.until);
    }
  }, [mode]);

  // Push events to calendar element
  useEffect(() => {
    const calendar = calendarRef.current;
    if (calendar) {
      calendar.events = events;
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
        void fetchData(from, until);
      }
    };

    const handleRefreshCalendar = () => {
      if (currentRange) {
        void fetchData(currentRange.from, currentRange.until);
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
                onAddException={(i) => void handleAddException(i)}
                onRemoveException={(i) => void handleRemoveException(i)}
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
