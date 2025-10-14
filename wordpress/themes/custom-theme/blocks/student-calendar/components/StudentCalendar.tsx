import { useEffect, useRef, useState } from "@wordpress/element";
import type {
  BaseCalendarEvent,
  ThriveCalendarElement,
  Teacher,
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
import Header from "./Header";
import BookingFilters from "./BookingFilters";
import TeacherGrid from "./TeacherGrid";
import { useEventClick } from "./useEventClick";

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
    [],
  );
  const [groupSessions, setGroupSessions] = useState<BaseCalendarEvent[]>([]);

  console.log("Student Calendar", currentRange);
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
    void (async () => {
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
      void fetchData(currentRange.from, currentRange.until);
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
      type BookingWithTeacher = BaseCalendarEvent & { teacherName?: string };

      const styledBookings = studentBookings.map((booking) => {
        // Use teacher name from the event (now included from backend)
        const teacherName =
          (booking as BookingWithTeacher).teacherName ?? "Unknown Teacher";

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
      calendar.events = events;
      // Set initial range if not set
      if (!currentRange && calendar.fromDate && calendar.untilDate) {
        setCurrentRange({
          from: new Date(calendar.fromDate),
          until: new Date(calendar.untilDate),
        });
      }
    }
  }, [events, currentRange]);

  useEventClick({
    calendarRef,
    mode,
    currentRange,
    fetchData,
    setCurrentRange,
  });

  // Handle calendar events
  useEffect(() => {
    // Wire calendar and document-level event listeners via hook

    // Keep backward-compatible DOM listeners for booking and waitlist actions
    // which call the modal helpers imported above.
    type BookingEventDetail = {
      event: {
        bookingId?: number;
        title?: string;
        start?: string | number | Date;
        teacherName?: string;
      };
    };

    const onBookingAction = (e: Event) => {
      const detail = (e as CustomEvent<BookingEventDetail>)?.detail;
      const evt = detail?.event;
      if (!evt) return;
      showBookingActionsModal({
        bookingId: evt.bookingId ?? -1,
        sessionTitle: evt.title || "Session",
        sessionDate: evt.start ? new Date(evt.start).toLocaleDateString() : "",
        sessionTime: evt.start
          ? new Date(evt.start).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        teacherName: evt.teacherName || "Teacher",
        onClose: () => {},
        onRefresh: () => {
          if (currentRange) {
            void fetchData(currentRange.from, currentRange.until);
          }
        },
      });
    };

    type WaitlistEventDetail = {
      event: {
        sessionId: number;
        title: string;
        startUtc: string;
        level?: unknown;
        teacher?: unknown;
      };
    };

    const onShowWaitlist = (e: Event) => {
      const detail = (e as CustomEvent<WaitlistEventDetail>)?.detail;
      const evt = detail?.event;
      if (!evt) return;
      showWaitlistModal({
        sessionId: evt.sessionId,
        title: evt.title,
        startAt: evt.startUtc,
        level: evt.level as { code: string; name: string } | undefined,
        teacher: evt.teacher as { name: string } | undefined,
        onJoin: () => {
          if (currentRange) {
            void fetchData(currentRange.from, currentRange.until);
          }
        },
      });
    };

    document.addEventListener(
      "thrive:booking-action",
      onBookingAction as EventListener,
    );
    document.addEventListener(
      "thrive:show-waitlist",
      onShowWaitlist as EventListener,
    );

    return () => {
      document.removeEventListener(
        "thrive:booking-action",
        onBookingAction as EventListener,
      );
      document.removeEventListener(
        "thrive:show-waitlist",
        onShowWaitlist as EventListener,
      );
    };
  }, [currentRange]);

  const toggleTeacher = (id: number) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const toggleLevel = (id: number) => {
    setSelectedLevelIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    );
  };

  return (
    <div
      className="student-calendar-wrapper"
      style={{ height: "100%", width: "100%" }}
    >
      <Header mode={mode} setMode={setMode} />

      {mode === "book" && (
        <div style={{ marginTop: 0, padding: "0 16px 16px 16px" }}>
          <BookingFilters
            showPrivateSessions={showPrivateSessions}
            showGroupClasses={showGroupClasses}
            setShowPrivateSessions={setShowPrivateSessions}
            setShowGroupClasses={setShowGroupClasses}
            sessionDuration={sessionDuration}
            setSessionDuration={setSessionDuration}
            levels={levels}
            selectedLevelIds={selectedLevelIds}
            toggleLevel={toggleLevel}
          />

          <div style={{ marginTop: 12 }}>
            <TeacherGrid
              teachers={teachers}
              selectedTeacherIds={selectedTeacherIds}
              toggleTeacher={toggleTeacher}
            />
          </div>
        </div>
      )}

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
