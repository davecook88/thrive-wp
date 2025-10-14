import { useEffect, useRef, useState } from "@wordpress/element";
import type {
  BaseCalendarEvent,
  ThriveCalendarElement,
  CalendarEventClickEvent,
  CalendarRangeChangeEvent,
  BookingEvent,
} from "../../../../../../shared/types/calendar";
import { thriveClient } from "../../../../../../shared/clients/thrive";
import { useAvailabilitySlots } from "../../hooks/use-availability-slots";
import { fetchStudentBookings } from "../../student-calendar/utils/calendarData";
import { PublicTeacherDto } from "@shared/types/teachers";

interface Props {
  view: "week" | "day" | "month" | "list";
  slotDuration: number;
  snapTo: number;
  viewHeight: number;
  heading?: string;
  showFilters?: boolean;
}

export default function PrivateSessionAvailabilityCalendar({
  view,
  slotDuration,
  snapTo,
  viewHeight,
  heading = "Book a Private Session",
  showFilters = true,
}: Props) {
  const calendarRef = useRef<ThriveCalendarElement>(null);
  const [events, setEvents] = useState<BaseCalendarEvent[]>([]);
  const [teachers, setTeachers] = useState<PublicTeacherDto[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>(
    teachers?.length ? teachers.map((t) => t.id) : [],
  );
  const [sessionDuration, setSessionDuration] = useState<number>(60); // Default to 1 hour
  const [currentRange, setCurrentRange] = useState<{
    from: Date;
    until: Date;
  } | null>(null);
  const [studentBookings, setStudentBookings] = useState<BookingEvent[]>([]);

  // Use availability slots hook
  const { availabilitySlots } = useAvailabilitySlots({
    start: currentRange?.from || null,
    end: currentRange?.until || null,
    selectedTeacherIds,
    sessionDuration,
    slotDuration,
  });

  useEffect(() => {
    if (!teachers?.length || selectedTeacherIds.length) return;
    setSelectedTeacherIds(teachers.map((t) => t.id));
  }, [teachers, selectedTeacherIds.length]);

  // Load teachers list once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await thriveClient.fetchTeachers();
      if (mounted) setTeachers(t);
    })().catch(console.error);
    return () => {
      mounted = false;
    };
  }, []);

  // When range changes, update current range
  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

    const handleRangeChange = (e: CalendarRangeChangeEvent) => {
      const detail = e.detail;
      if (detail?.fromDate && detail?.untilDate) {
        const from = new Date(detail.fromDate);
        const until = new Date(detail.untilDate);
        setCurrentRange({ from, until });

        // Fetch student bookings for this range
        void fetchStudentBookings(from, until).then(setStudentBookings);
      }
    };
    calendar.addEventListener("range:change", handleRangeChange);
    handleRangeChange({
      detail: { fromDate: calendar.fromDate, untilDate: calendar.untilDate },
    } as CalendarRangeChangeEvent);
    return () => {
      calendar.removeEventListener("range:change", handleRangeChange);
    };
  }, [selectedTeacherIds, sessionDuration]);

  // Update events when availability slots or bookings change
  useEffect(() => {
    // Style student bookings as "booked" events
    const styledBookings = studentBookings.map((booking) => {
      // Find teacher name from teacherId
      const teacher = teachers.find((t) => t.id === booking.teacherId);

      return {
        ...booking,
        title: `Class with ${teacher?.displayName || "Teacher"}`,
        type: "booking" as const,
        // Add styling properties for greyed out appearance
        isBooked: true,
      };
    });

    // Combine availability slots and styled bookings
    setEvents([...availabilitySlots, ...styledBookings]);
  }, [availabilitySlots, studentBookings]);

  // Push events to calendar element
  useEffect(() => {
    const calendar = calendarRef.current;
    if (calendar) {
      calendar.events = events;
    }
  }, [events]);

  // Basic handlers similar to student calendar
  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

    const handleEventClick = (e: CalendarEventClickEvent) => {
      const event = e.detail.event;
      if (event) {
        // Broadcast to the selected-event-modal runtime
        document.dispatchEvent(
          new CustomEvent("thrive-calendar:selectedEvent", {
            detail: { event },
          }),
        );
      }
    };
    calendar.addEventListener("event:click", handleEventClick);
    return () => {
      calendar.removeEventListener("event:click", handleEventClick);
    };
  }, []);

  const toggleTeacher = (id: number) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const getInitials = (t: PublicTeacherDto) =>
    (t.displayName || "T").slice(0, 1).toUpperCase();

  return (
    <div style={{ height: "100%", width: "100%" }}>
      {(heading || showFilters) && (
        <div style={{ marginBottom: 12 }}>
          {heading && <h3 style={{ margin: "0 0 8px 0" }}>{heading}</h3>}
          {showFilters && (
            <div style={{ marginBottom: 16 }}>
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "8px",
                  marginBottom: 8,
                }}
              >
                {teachers.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTeacher(t.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      background: selectedTeacherIds.includes(t.id)
                        ? "#f3f4f6"
                        : "white",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#374151",
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
                        {t.displayName?.trim()}
                      </div>
                      {t.bio && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.bio}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <thrive-calendar
        ref={calendarRef}
        view={view}
        mode="public"
        slot-duration={sessionDuration.toString()}
        snap-to={snapTo.toString()}
        show-classes="false"
        show-availability="true"
        show-bookings="true"
        view-height={viewHeight.toString()}
        event-booking-bg="#9ca3af"
        event-booking-fg="#6b7280"
      />
    </div>
  );
}
