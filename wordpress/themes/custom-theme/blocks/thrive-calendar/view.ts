// Frontend view bindings for <thrive-calendar> elements to the Calendar Context API
import { getCalendarContextSafe } from "../../types/calendar-utils";

function attachCalendar(cal: HTMLElement) {
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

  // Initial sync
  (cal as any).events = api.events;
  const dateAttr = cal.getAttribute("date");
  if (dateAttr) api.setAnchor(new Date(dateAttr));
  const viewAttr = (cal.getAttribute("view") as any) || undefined;
  if (viewAttr) api.setView(viewAttr);

  // React to context -> calendar updates
  const onCtxEvents = (e: Event) => {
    console.log("Thrive Calendar: Context events updated", e);
    const detail = (e as CustomEvent).detail as
      | { contextId?: string; events?: any[] }
      | undefined;
    if (!detail) return;
    (cal as any).events = Array.isArray(detail.events) ? detail.events : [];
  };
  ctxEl.addEventListener(
    "thrive-calendar:events",
    onCtxEvents as EventListener
  );

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
