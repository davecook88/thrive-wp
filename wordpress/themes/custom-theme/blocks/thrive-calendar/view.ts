// Frontend view bindings for <thrive-calendar> elements to the Calendar Context API
import { getCalendarContextSafe } from "../../types/calendar-utils";

function weekRangeFor(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // Sunday start
  const start = new Date(d);
  start.setDate(d.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function attachCalendar(cal: HTMLElement) {
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

  // Initial sync
  (cal as any).events = api.events;
  const dateAttr = cal.getAttribute("date");
  if (dateAttr) api.setAnchor(new Date(dateAttr));
  const viewAttr = (cal.getAttribute("view") as any) || undefined;
  if (viewAttr) api.setView(viewAttr);
  const { start, end } = weekRangeFor(api.anchor);
  void api.ensureRange(start, end);

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
}

function onReady() {
  document
    .querySelectorAll<HTMLElement>("thrive-calendar")
    .forEach((cal) => attachCalendar(cal));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onReady);
} else {
  onReady();
}

export {};
