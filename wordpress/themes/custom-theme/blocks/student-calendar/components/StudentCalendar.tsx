import { useEffect, useRef, useState, useMemo } from "@wordpress/element";
import type {
  BaseCalendarEvent,
  ThriveCalendarElement,
  Teacher,
  AvailabilityEvent,
  Level,
} from "../../../../../shared/types/calendar";
import { thriveClient } from "../../../../../shared/clients/thrive";
import {
  fetchStudentBookings,
  fetchAvailableGroupSessions,
} from "../utils/calendarData";
import { useAvailabilitySlots } from "../../hooks/use-availability-slots";
import { showBookingActionsModal } from "../../../components/BookingActionsModal";
import { showWaitlistModal } from "../../../components/WaitlistModal";

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
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);
  const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>([]);
  const [showPrivateSessions, setShowPrivateSessions] = useState<boolean>(true);
  const [showGroupClasses, setShowGroupClasses] = useState<boolean>(true);
  const [sessionDuration, setSessionDuration] = useState<number>(60);
  const [currentRange, setCurrentRange] = useState<{
    from: Date;
    until: Date;
  } | null>(null);
  const [studentBookings, setStudentBookings] = useState<BaseCalendarEvent[]>(
    []
  );
  const [groupSessions, setGroupSessions] = useState<BaseCalendarEvent[]>([]);

  // Use availability slots hook for booking mode
  const { availabilitySlots } = useAvailabilitySlots({
    start: currentRange?.from || null,
    end: currentRange?.until || null,
    selectedTeacherIds,
    sessionDuration,
    slotDuration,
  });

  // Load teachers and levels lists once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [t, l] = await Promise.all([
        thriveClient.fetchTeachers(),
        thriveClient.fetchLevels(),
      ]);
      if (mounted) {
        setTeachers(t);
        setSelectedTeacherIds(t.map((teacher) => teacher.teacherId));
        setLevels(l);
        setSelectedLevelIds(l.map((level) => level.id));
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
      // In booking mode, fetch availability slots, student bookings, and group sessions
      const [bookings, groupSessionsData] = await Promise.all([
        fetchStudentBookings(start, end),
        showGroupClasses
          ? fetchAvailableGroupSessions(start, end, {
              levelId:
                selectedLevelIds.length > 0 ? selectedLevelIds[0] : undefined,
            })
          : Promise.resolve([]),
      ]);
      setStudentBookings(bookings);
      setGroupSessions(groupSessionsData);
      // Events will be combined in the useEffect below
    }
  };

  // Refetch when mode, teachers, levels, or duration changes
  useEffect(() => {
    if (currentRange) {
      fetchData(currentRange.from, currentRange.until);
    }
  }, [
    mode,
    selectedTeacherIds,
    selectedLevelIds,
    sessionDuration,
    showPrivateSessions,
    showGroupClasses,
  ]);

  // Update events when availability slots change (for booking mode)
  useEffect(() => {
    if (mode === "book") {
      // Style student bookings as "booked" events
      const styledBookings = studentBookings.map((booking) => {
        // Use teacher name from the event (now included from backend)
        const teacherName = (booking as any).teacherName || "Unknown Teacher";

        return {
          ...booking,
          title: `Class with ${teacherName}`,
          type: "booking" as const,
          // Add styling properties for greyed out appearance
          isBooked: true,
        };
      });

      const eventsList: BaseCalendarEvent[] = [];

      // Add availability slots only if showing private sessions
      if (showPrivateSessions) {
        eventsList.push(...availabilitySlots);
      }

      // Add group sessions only if showing group classes
      if (showGroupClasses) {
        eventsList.push(...groupSessions);
      }

      // Always add styled bookings
      eventsList.push(...styledBookings);

      setEvents(eventsList);
    }
  }, [
    availabilitySlots,
    studentBookings,
    groupSessions,
    mode,
    showPrivateSessions,
    showGroupClasses,
  ]);

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
        // Handle booking events specially
        if (event.type === "booking") {
          // Show booking actions modal
          showBookingActionsModal({
            bookingId: event.bookingId,
            sessionTitle: event.title || "Session",
            sessionDate: event.start
              ? new Date(event.start).toLocaleDateString()
              : "",
            sessionTime: event.start
              ? new Date(event.start).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            teacherName: event.teacherName || "Teacher",
            onClose: () => {
              // Close the modal - handled inside the modal component
            },
            onRefresh: () => {
              // Refresh the calendar data
              if (currentRange) {
                fetchData(currentRange.from, currentRange.until);
              }
            },
          });
          return;
        }

        // Handle group class events
        if (
          event.type === "class" &&
          event.serviceType === "GROUP" &&
          mode === "book"
        ) {
          // Check if the class is full
          if (event.isFull && event.canJoinWaitlist) {
            // Show waitlist modal
            showWaitlistModal({
              sessionId: event.sessionId,
              title: event.title,
              startAt: event.startUtc,
              level: event.level,
              teacher: event.teacher,
              onJoin: () => {
                // Refresh calendar after joining waitlist
                if (currentRange) {
                  fetchData(currentRange.from, currentRange.until);
                }
              },
            });
            return;
          }
          // If not full, fall through to the regular booking modal
        }

        // For other events, broadcast to the selected-event-modal runtime
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

    const handleRefreshCalendar = () => {
      // Refetch current range when refresh event is triggered
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

  const toggleTeacher = (id: number) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleLevel = (id: number) => {
    setSelectedLevelIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
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
            {/* Class Type Filter */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#374151",
                }}
              >
                Class Type
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <label
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <input
                    type="checkbox"
                    checked={showPrivateSessions}
                    onChange={(e) => setShowPrivateSessions(e.target.checked)}
                  />
                  <span style={{ fontSize: 14 }}>Private Sessions</span>
                </label>
                <label
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <input
                    type="checkbox"
                    checked={showGroupClasses}
                    onChange={(e) => setShowGroupClasses(e.target.checked)}
                  />
                  <span style={{ fontSize: 14 }}>Group Classes</span>
                </label>
              </div>
            </div>

            {/* Level Filter - Only show when group classes are enabled */}
            {showGroupClasses && levels.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "#374151",
                  }}
                >
                  Filter by Level
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {levels.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => toggleLevel(level.id)}
                      style={{
                        padding: "6px 12px",
                        border: "2px solid",
                        borderColor: selectedLevelIds.includes(level.id)
                          ? "var(--wp--preset--color--accent, #10b981)"
                          : "#e5e7eb",
                        borderRadius: 6,
                        background: selectedLevelIds.includes(level.id)
                          ? "var(--wp--preset--color--accent-light, #f0fdf4)"
                          : "white",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: selectedLevelIds.includes(level.id)
                          ? "var(--wp--preset--color--accent, #10b981)"
                          : "#6b7280",
                        transition: "all 150ms ease",
                      }}
                    >
                      {level.code}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
