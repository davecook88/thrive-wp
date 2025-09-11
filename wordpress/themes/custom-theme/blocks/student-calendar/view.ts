// Frontend view bindings for student calendar <thrive-calendar> elements
import type {
  BaseCalendarEvent,
  ThriveCalendarElement,
} from "../../types/calendar";

type ThriveCalendarEl = ThriveCalendarElement;

function attachStudentCalendar(cal: ThriveCalendarEl) {
  console.log("Student Calendar: Attaching to calendar element", cal);

  // For student calendar, we don't need context API integration
  // The web component will handle fetching student sessions directly

  // Wire up basic event handlers
  cal.addEventListener("event:click", (e: any) => {
    const event = e?.detail?.event;
    if (event) {
      console.log("Student Calendar: Event clicked", event);
      // Could dispatch custom event for modal handling if needed
    }
  });

  cal.addEventListener("today", () => {
    console.log("Student Calendar: Today button clicked");
  });

  cal.addEventListener("navigate", (e: any) => {
    const dir = e?.detail?.direction === "next" ? "next" : "prev";
    console.log("Student Calendar: Navigate", dir);
  });

  cal.addEventListener("set-view", (e: any) => {
    const v = e?.detail?.view as any;
    if (v) {
      console.log("Student Calendar: Set view", v);
    }
  });

  // Listen for range changes to potentially prefetch data
  cal.addEventListener("range:change", (e: any) => {
    const detail = e?.detail as { fromDate?: string; untilDate?: string };
    if (detail?.fromDate && detail?.untilDate) {
      console.log("Student Calendar: Range changed", detail);
    }
  });
}

function onReady() {
  // Only attach to calendars within student-calendar blocks
  document
    .querySelectorAll<HTMLElement>(".student-calendar-wrapper thrive-calendar")
    .forEach((el) => attachStudentCalendar(el as unknown as ThriveCalendarEl));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onReady);
} else {
  onReady();
}

export {};
