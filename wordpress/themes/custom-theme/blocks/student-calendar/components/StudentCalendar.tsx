import { useEffect, useRef, useState, useMemo } from "@wordpress/element";
import type {
  BaseCalendarEvent,
  ThriveCalendarElement,
  Teacher,
  AvailabilityEvent,
} from "../../../types/calendar";
import { thriveClient } from "../../../clients/thrive";
import { fetchStudentBookings } from "../utils/calendarData";
import { useAvailabilitySlots } from "../../hooks/use-availability-slots";

interface StudentCalendarProps {
  view: "week" | "day" | "month" | "list";
  slotDuration: number;
  snapTo: number;
  viewHeight: number;
}

type CalendarMode = "view" | "book";

export default function StudentCalendar({
  view,
  slotDuration,
  snapTo,
  viewHeight,
}: StudentCalendarProps) {
  const calendarRef = useRef<ThriveCalendarElement>(null);
  const [mode, setMode] = useState<CalendarMode>("view");
  const [events, setEvents] = useState<BaseCalendarEvent[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);
  const [sessionDuration, setSessionDuration] = useState<number>(60);
  const [currentRange, setCurrentRange] = useState<{
    from: Date;
    until: Date;
  } | null>(null);
  const [studentBookings, setStudentBookings] = useState<BaseCalendarEvent[]>(
    []
  );

  // Use availability slots hook for booking mode
  const { availabilitySlots } = useAvailabilitySlots({
    start: currentRange?.from || null,
    end: currentRange?.until || null,
    selectedTeacherIds,
    sessionDuration,
    slotDuration,
  });

  // Load teachers list once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await thriveClient.fetchTeachers();
      if (mounted) {
        setTeachers(t);
        setSelectedTeacherIds(t.map((teacher) => teacher.teacherId));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch data based on current mode and range
  const fetchData = async (start: Date, end: Date) => {
    if (mode === "view") {
      const bookings = await fetchStudentBookings(start, end);
      setEvents(bookings);
    } else {
      // In booking mode, fetch both availability slots and student bookings
      const [bookings] = await Promise.all([fetchStudentBookings(start, end)]);
      setStudentBookings(bookings);
      // Events will be combined in the useEffect below
    }
  };

  // Refetch when mode, teachers, or duration changes
  useEffect(() => {
    if (currentRange) {
      fetchData(currentRange.from, currentRange.until);
    }
  }, [mode, selectedTeacherIds, sessionDuration]);

  // Update events when availability slots change (for booking mode)
  useEffect(() => {
    if (mode === "book") {
      // Style student bookings as "booked" events
      const styledBookings = studentBookings.map((booking) => {
        // Find teacher name from teacherId
        const teacher = teachers.find(t => t.teacherId === (booking as any).teacherId);
        const teacherName = teacher ? teacher.name || `${teacher.firstName} ${teacher.lastName}`.trim() : 'Unknown Teacher';

        return {
          ...booking,
          title: `Class with ${teacherName}`,
          type: "booking" as const,
          // Add styling properties for greyed out appearance
          isBooked: true,
        };
      });

      // Combine availability slots and styled bookings
      setEvents([...availabilitySlots, ...styledBookings]);
    }
  }, [availabilitySlots, studentBookings, mode]);

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
      if (event) {
        // Broadcast to the selected-event-modal runtime
        document.dispatchEvent(
          new CustomEvent("thrive-calendar:selectedEvent", {
            detail: { event },
          })
        );
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

    calendar.addEventListener("event:click", handleEventClick);
    calendar.addEventListener("range:change", handleRangeChange);

    return () => {
      calendar.removeEventListener("event:click", handleEventClick);
      calendar.removeEventListener("range:change", handleRangeChange);
    };
  }, []);

  const toggleTeacher = (id: number) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const getInitials = (t: Teacher) =>
    (t.firstName || t.name || "T").slice(0, 1).toUpperCase();

  return (
    <div
      className="student-calendar-wrapper"
      style={{ height: "100%", width: "100%" }}
    >
      {/* Mode Toggle Header */}
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          background:
            mode === "view"
              ? "var(--wp--preset--color--gray-50)"
              : "var(--wp--preset--color--accent-light, #f0fdf4)",
          borderRadius: 12,
          border: "2px solid",
          borderColor:
            mode === "view"
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
            marginBottom: mode === "book" ? 16 : 0,
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
              onClick={() => setMode("view")}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                background:
                  mode === "view"
                    ? "var(--wp--preset--color--accent, #3b82f6)"
                    : "transparent",
                color:
                  mode === "view"
                    ? "white"
                    : "var(--wp--preset--color--gray-700)",
                transition: "all 150ms ease",
              }}
            >
              📅 My Sessions
            </button>
            <button
              type="button"
              onClick={() => setMode("book")}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                background:
                  mode === "book"
                    ? "var(--wp--preset--color--accent, #10b981)"
                    : "transparent",
                color:
                  mode === "book"
                    ? "white"
                    : "var(--wp--preset--color--gray-700)",
                transition: "all 150ms ease",
              }}
            >
              ➕ Book More
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
                mode === "view"
                  ? "var(--wp--preset--color--gray-100)"
                  : "var(--wp--preset--color--accent, #10b981)",
              color: mode === "view" ? "#374151" : "white",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {mode === "view" ? (
              <>👁️ Viewing your scheduled sessions</>
            ) : (
              <>✨ Browsing available time slots</>
            )}
          </div>
        </div>

        {/* Booking mode filters */}
        {mode === "book" && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="session-duration"
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#374151",
                }}
              >
                Session Duration
              </label>
              <select
                id="session-duration"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(Number(e.target.value))}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  backgroundColor: "white",
                  minWidth: 120,
                }}
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#374151",
                }}
              >
                Filter by Teacher
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "8px",
                }}
              >
                {teachers.map((t) => (
                  <button
                    key={t.teacherId}
                    type="button"
                    onClick={() => toggleTeacher(t.teacherId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      background: selectedTeacherIds.includes(t.teacherId)
                        ? "white"
                        : "#f9fafb",
                      cursor: "pointer",
                      textAlign: "left",
                      opacity: selectedTeacherIds.includes(t.teacherId)
                        ? 1
                        : 0.5,
                      transition: "all 150ms ease",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: selectedTeacherIds.includes(t.teacherId)
                          ? "var(--wp--preset--color--accent, #10b981)"
                          : "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: selectedTeacherIds.includes(t.teacherId)
                          ? "white"
                          : "#374151",
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(t)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          marginBottom: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.name || `${t.firstName} ${t.lastName}`.trim()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Component */}
      <thrive-calendar
        ref={calendarRef}
        view={view}
        mode="student"
        slot-duration={
          mode === "book" ? sessionDuration.toString() : slotDuration.toString()
        }
        snap-to={snapTo.toString()}
        show-classes="true"
        show-availability={mode === "book" ? "true" : "false"}
        show-bookings="true"
        view-height={viewHeight.toString()}
        event-booking-bg="#9ca3af"
        event-booking-fg="#6b7280"
      />
    </div>
  );
}
