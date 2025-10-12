import { useEffect, useCallback } from "@wordpress/element";
import type { ThriveCalendarElement } from "../../../../../shared/types/calendar";

interface UseEventClickArgs {
  calendarRef: { current: ThriveCalendarElement | null };
  mode: "view" | "book";
  currentRange: { from: Date; until: Date } | null;
  fetchData: (from: Date, until: Date) => Promise<void>;
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
}: UseEventClickArgs) {
  const handleEventClick = useCallback(
    (e: any) => {
      const event = e?.detail?.event;
      if (!event) return;

      // Booking events: open booking actions modal via DOM event
      if (event.type === "booking") {
        const bookingEvent = new CustomEvent("thrive:booking-action", {
          detail: { event },
        });
        document.dispatchEvent(bookingEvent);
        return;
      }

      // For group classes in booking mode we fire a waitlist event so the
      // caller can show a modal if needed; otherwise the selected-event modal
      // is opened.
      if (
        event.type === "class" &&
        event.serviceType === "GROUP" &&
        mode === "book"
      ) {
        const classEvent = event;
        if (classEvent.isFull && classEvent.canJoinWaitlist) {
          const waitlistEvent = new CustomEvent("thrive:show-waitlist", {
            detail: { event: classEvent },
          });
          document.dispatchEvent(waitlistEvent);
          return;
        }
      }

      // Default: notify selected-event-modal runtime
      document.dispatchEvent(
        new CustomEvent("thrive-calendar:selectedEvent", { detail: { event } })
      );
    },
    [mode]
  );

  const handleRangeChange = useCallback(
    (e: any) => {
      const detail = e?.detail as { fromDate?: string; untilDate?: string };
      if (detail?.fromDate && detail?.untilDate) {
        const from = new Date(detail.fromDate);
        const until = new Date(detail.untilDate);
        // update data for the new range
        fetchData(from, until).catch(() => {});
      }
    },
    [fetchData]
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
  }, [calendarRef, handleEventClick, handleRangeChange, handleRefreshCalendar]);
}
