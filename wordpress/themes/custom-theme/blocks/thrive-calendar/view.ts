// Frontend view bindings for <thrive-calendar> elements to the Calendar Context API
import { getCalendarContextSafe } from "../../types/calendar-utils";
import type {
  BaseCalendarEvent,
  ThriveCalendarElement,
} from "../../types/calendar";

type ThriveCalendarEl = ThriveCalendarElement;

function attachCalendar(cal: ThriveCalendarEl) {
  console.log("Thrive Calendar: Attaching to calendar element", cal);
  const ctxEl = cal.closest(
    ".wp-block-custom-theme-thrive-calendar-context"
  ) as HTMLElement | null;
  if (!ctxEl) {
    console.warn(
      "Thrive Calendar: No context wrapper found for calendar element",
      cal
    );
    return;
  }
  const api = getCalendarContextSafe(ctxEl);
  if (!api) {
    console.warn("Thrive Calendar: Context API not found on element", ctxEl);
    return;
  }

  console.log("Thrive Calendar: Attaching calendar to context", api.id);
  api.registerCalendar(cal);

  // Initial sync
  cal.events = api.events as BaseCalendarEvent[];
  const dateAttr = cal.getAttribute("date");
  if (dateAttr) api.setAnchor(new Date(dateAttr));
  const viewAttr = (cal.getAttribute("view") as any) || undefined;
  if (viewAttr) api.setView(viewAttr);

  // React to context -> calendar updates
  const onCtxEvents = (e: Event) => {
    const detail = (e as CustomEvent).detail as
      | { contextId?: string; events?: any[] }
      | undefined;
    if (!detail) return;
    cal.events = Array.isArray(detail.events)
      ? (detail.events as BaseCalendarEvent[])
      : [];
  };
  ctxEl.addEventListener(
    "thrive-calendar:events",
    onCtxEvents as EventListener
  );

  // When the calendar’s visible range changes, consumers will fetch using UTC dates
  const onRange = (e: Event) => {
    const detail = (e as CustomEvent).detail as
      | { fromDate?: string; untilDate?: string }
      | undefined;
    if (!detail?.fromDate || !detail?.untilDate) return;
    // Optionally, contexts listening on ctxEl will react; if needed we could forward to API here
  };
  cal.addEventListener("range:change", onRange as EventListener);

  // Wire UI -> context
  cal.addEventListener("event:click", (e: any) => {
    api.setSelectedEvent(e?.detail?.event || null);
  });
  cal.addEventListener("today", () => {
    console.log("Thrive Calendar: Today button clicked");
    api.goToToday();
  });
  cal.addEventListener("navigate", (e: any) => {
    const dir = e?.detail?.direction === "next" ? "next" : "prev";
    console.log("Thrive Calendar: Navigate", dir);
    api.navigate(dir);
  });
  cal.addEventListener("set-view", (e: any) => {
    const v = e?.detail?.view as any;
    if (v) {
      console.log("Thrive Calendar: Set view", v);
      api.setView(v);
    }
  });

  // TODO: consider an observer to unregister on removal
}

function onReady() {
  // Only attach calendars that live inside a Thrive Calendar Context wrapper.
  // This avoids interfering with standalone calendars (e.g., student-calendar block)
  // that manage their own lifecycle and do not use the shared context runtime.
  document
    .querySelectorAll<HTMLElement>(
      ".wp-block-custom-theme-thrive-calendar-context thrive-calendar"
    )
    .forEach((el) => attachCalendar(el as unknown as ThriveCalendarEl));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onReady);
} else {
  onReady();
}

export {};
