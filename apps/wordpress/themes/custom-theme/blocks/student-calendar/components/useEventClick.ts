import { useEffect, useCallback } from "@wordpress/element";
import type {
  ThriveCalendarElement,
  CalendarEventClickEvent,
  CalendarRangeChangeEvent,
} from "../../../../../shared/calendar";
import { isBookingEvent } from "@thrive/shared";

interface UseEventClickArgs {
  calendarRef: { current: ThriveCalendarElement | null };
  mode: "view" | "book";
  currentRange: { from: Date; until: Date } | null;
  fetchData: (from: Date, until: Date) => Promise<void>;
  setCurrentRange: (range: { from: Date; until: Date }) => void;
}

/**
 * Hook to wire calendar event listeners (event:click, range:change) and a
 * document-level refresh event. The implementation extracts small handlers
 * for readability and keeps StudentCalendar useEffect minimal.
 */
export function useEventClick({
  calendarRef,
  mode,
  currentRange,
  fetchData,
  setCurrentRange,
}: UseEventClickArgs) {
  const handleEventClick = useCallback(
    (e: CalendarEventClickEvent) => {
      const event = e.detail.event;
      if (!event) return;

      // Booking events: open booking actions modal via DOM event
      if (isBookingEvent(event)) {
        const bookingEvent = new CustomEvent("thrive:booking-action", {
          detail: { event },
        });
        document.dispatchEvent(bookingEvent);
        return;
      }

      // For group classes in booking mode we fire a waitlist event so the
      // caller can show a modal if needed; otherwise the selected-event modal
      // is opened.
      // if (isGroupClassEvent(event) && mode === "book") {
      //   if (event.isFull && event.canJoinWaitlist) {
      //     const waitlistEvent = new CustomEvent("thrive:show-waitlist", {
      //       detail: { event },
      //     });
      //     document.dispatchEvent(waitlistEvent);
      //     return;
      //   }
      // }

      // Default: notify selected-event-modal runtime
      document.dispatchEvent(
        new CustomEvent("thrive-calendar:selectedEvent", { detail: { event } }),
      );
    },
    [mode],
  );

  const handleRangeChange = useCallback(
    (e: CalendarRangeChangeEvent) => {
      const detail = e.detail;
      if (detail?.fromDate && detail?.untilDate) {
        const from = new Date(detail.fromDate);
        const until = new Date(detail.untilDate);
        setCurrentRange({ from, until });
        // update data for the new range
        void fetchData(from, until);
      }
    },
    [fetchData, setCurrentRange],
  );

  const handleRefreshCalendar = useCallback(() => {
    if (currentRange) {
      fetchData(currentRange.from, currentRange.until).catch(() => {});
    }
  }, [currentRange, fetchData]);

  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

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
  }, [calendarRef, handleEventClick, handleRangeChange, handleRefreshCalendar]);
}
