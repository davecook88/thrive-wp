import { useEffect, useRef, useState } from "@wordpress/element";
import type {
  BaseCalendarEvent,
  ThriveCalendarElement,
  Teacher,
  AvailabilityEvent,
} from "../../../types/calendar";
import { thriveClient } from "../../../clients/thrive";

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
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>(
    teachers?.length ? teachers.map((t) => t.teacherId) : []
  );

  useEffect(() => {
    if (!teachers?.length || selectedTeacherIds.length) return;
    setSelectedTeacherIds(teachers.map((t) => t.teacherId));
  }, [teachers, selectedTeacherIds.length]);

  // Load teachers list once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await thriveClient.fetchTeachers();
      if (mounted) setTeachers(t);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Helper to fetch availability for a given range
  const fetchAvailability = async (start: Date, end: Date) => {
    if (selectedTeacherIds.length === 0) return;
    if (end < new Date()) return;
    const avail = await thriveClient.fetchAvailabilityPublic({
      start,
      end,
      teacherIds: selectedTeacherIds.length ? selectedTeacherIds : undefined,
    });
    // Chunk windows into slot-sized availability events
    const chunkMinutes = Math.max(5, Number(slotDuration) || 30);
    const chunks: AvailabilityEvent[] = avail.flatMap((w) => {
      const winStart = new Date(w.startUtc);
      const winEnd = new Date(w.endUtc);
      const out: AvailabilityEvent[] = [];
      let current = new Date(winStart);
      while (current < winEnd) {
        const next = new Date(current.getTime() + chunkMinutes * 60 * 1000);
        const chunkEnd = next > winEnd ? new Date(winEnd) : next;
        out.push({
          id: `avail:${current.toISOString()}|${chunkEnd.toISOString()}`,
          title: "Available",
          startUtc: current.toISOString(),
          endUtc: chunkEnd.toISOString(),
          type: "availability",
          teacherIds: w.teacherIds,
        });
        current = new Date(chunkEnd);
      }
      return out;
    });
    // filter any chunks in the past
    const now = new Date();
    const futureChunks = chunks.filter((e) => new Date(e.endUtc) >= now);
    setEvents(futureChunks);
  };

  // When range changes, fetch availability
  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

    const handleRangeChange = (e: any) => {
      const detail = e?.detail as { fromDate?: string; untilDate?: string };
      if (detail?.fromDate && detail?.untilDate) {
        fetchAvailability(
          new Date(detail.fromDate),
          new Date(detail.untilDate)
        );
      }
    };
    calendar.addEventListener("range:change", handleRangeChange);
    handleRangeChange({
      detail: { fromDate: calendar.fromDate, untilDate: calendar.untilDate },
    });
    return () => {
      calendar.removeEventListener("range:change", handleRangeChange);
    };
  }, [selectedTeacherIds]);

  // Push events to calendar element
  useEffect(() => {
    const calendar = calendarRef.current;
    if (calendar) {
      calendar.events = events as BaseCalendarEvent[];
    }
  }, [events]);

  // Basic handlers similar to student calendar
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
    calendar.addEventListener("event:click", handleEventClick);
    return () => {
      calendar.removeEventListener("event:click", handleEventClick);
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
    <div style={{ height: "100%", width: "100%" }}>
      {(heading || showFilters) && (
        <div style={{ marginBottom: 12 }}>
          {heading && <h3 style={{ margin: "0 0 8px 0" }}>{heading}</h3>}
          {showFilters && (
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
                      {t.name || `${t.firstName} ${t.lastName}`.trim()}
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
          )}
        </div>
      )}

      <thrive-calendar
        ref={calendarRef as any}
        view={view}
        mode="public"
        slot-duration={slotDuration.toString()}
        snap-to={snapTo.toString()}
        show-classes="false"
        show-availability="true"
        show-bookings="false"
        view-height={viewHeight.toString()}
      />
    </div>
  );
}
