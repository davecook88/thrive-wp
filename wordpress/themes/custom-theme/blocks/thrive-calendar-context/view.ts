// Thrive Calendar Context runtime. All logic and APIs are scoped to each

import type {
  ThriveCalendarContextApi,
  BaseCalendarEvent,
  CalendarView,
  ThriveCalendarElement,
} from "../../types/calendar";
import { thriveClient } from "../../clients/thrive";

// Typed Web Component interface for thrive-calendar
type ThriveCalendarEl = ThriveCalendarElement;

// '.wp-block-custom-theme-thrive-calendar-context' wrapper.
(() => {
  const REG = Symbol("thriveCalRegistry");
  type RegMap = Record<string, ThriveCalendarContextApi>;
  function getRegistry(root: Document | ShadowRoot): RegMap {
    const win = window as any;
    if (!win[REG]) win[REG] = {} as RegMap;
    return win[REG] as RegMap;
  }

  type DateRangeChangeCallback = (
    start: Date,
    end: Date
  ) => Promise<BaseCalendarEvent[]> | BaseCalendarEvent[];

  type SourceState = { events: BaseCalendarEvent[]; ranges: Set<string> };
  type CtxState = {
    id: string;
    events: BaseCalendarEvent[];
    selectedEvent: BaseCalendarEvent | null;
    sources: Record<string, SourceState>;
    selectedTeacherId?: string;
    view: CalendarView;
    anchor: Date;
    pending: Set<string>;
    dateRangeChangeCallbacks: DateRangeChangeCallback[];
    calendars: Set<ThriveCalendarEl>;
  };

  function emitEventsUpdate(state: CtxState) {
    // Notify any listeners (e.g., <thrive-calendar> instances) inside this context wrapper
    const el = document.getElementById(state.id);
    if (!el) return;
    const evt = new CustomEvent("thrive-calendar:events", {
      detail: { contextId: state.id, events: state.events },
      bubbles: true,
    });
    el.dispatchEvent(evt);
  }

  function mergeEvents(state: CtxState, events: BaseCalendarEvent[]) {
    console.log("Merging events from callback:", events.length, events);
    const all = [...state.events, ...events];
    all.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
    state.events = all;
    emitEventsUpdate(state);
  }

  function callDateRangeChangeCallbacks(
    state: CtxState,
    start: Date,
    end: Date
  ) {
    console.log("Thrive Calendar Context: Calling date range change callbacks");
    state.dateRangeChangeCallbacks.forEach((callback, index) => {
      try {
        const events = callback(start, end);

        if ("then" in events && typeof events?.then === "function") {
          events.then((resolvedEvents) => {
            mergeEvents(state, resolvedEvents);
          });
        } else {
          mergeEvents(state, events as BaseCalendarEvent[]);
        }
      } catch (error) {
        console.error("Error in date range change callback:", error);
      }
    });
  }

  function attachContext(ctxEl: HTMLElement) {
    const id =
      ctxEl.getAttribute("id") ||
      `cal-ctx-${Math.random().toString(36).slice(2, 8)}`;
    if (!ctxEl.id) ctxEl.id = id;

    const state: CtxState = {
      id,
      events: [],
      selectedEvent: null,
      sources: {},
      view: "week",
      anchor: new Date(),
      pending: new Set(),
      dateRangeChangeCallbacks: [],
      calendars: new Set<ThriveCalendarEl>(),
    };

    // Helper to emit callbacks based on the union of all attached calendars’ ranges.
    function emitCurrentRangeFromCalendars() {
      // Prefer first attached calendar; if none, derive a sensible default
      const first = state.calendars.values().next().value as
        | ThriveCalendarEl
        | undefined;
      if (first) {
        // fromDate/untilDate are already UTC ISO strings from the component
        const start = new Date(first.fromDate);
        const end = new Date(first.untilDate);
        callDateRangeChangeCallbacks(state, start, end);
      } else {
        // Fallback: week range from current anchor (UTC midnight bounds)
        const d = new Date(state.anchor);
        d.setUTCHours(0, 0, 0, 0);
        const dow = d.getUTCDay();
        const start = new Date(d);
        start.setUTCDate(d.getUTCDate() - dow);
        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + 7);
        callDateRangeChangeCallbacks(state, start, end);
      }
    }

    // Do not emit callbacks until a calendar provides its range

    // Expose a context-local API for descendants via DOM property
    const api: ThriveCalendarContextApi = {
      setSelectedTeacherId(teacherId: string | undefined) {
        state.selectedTeacherId = teacherId;
      },
      registerDateRangeChangeCallback(callback: DateRangeChangeCallback) {
        if (!state.dateRangeChangeCallbacks.includes(callback)) {
          state.dateRangeChangeCallbacks.push(callback);
          // Immediately run the new callback with the current calendar range (UTC)
          const first = state.calendars.values().next().value as
            | ThriveCalendarEl
            | undefined;
          if (first && first.fromDate && first.untilDate) {
            try {
              const start = new Date(first.fromDate);
              const end = new Date(first.untilDate);
              const result = callback(start, end);
              if (result && typeof (result as any).then === "function") {
                (result as Promise<BaseCalendarEvent[]>).then((evs) =>
                  mergeEvents(state, evs)
                );
              } else {
                mergeEvents(state, result as BaseCalendarEvent[]);
              }
            } catch (err) {
              console.error(
                "Error running immediate date range callback:",
                err
              );
            }
          }
          console.log(
            "Thrive Calendar Context: Registered callback, total callbacks:",
            state.dateRangeChangeCallbacks.length
          );
        }
      },
      unregisterDateRangeChangeCallback(callback: DateRangeChangeCallback) {
        const index = state.dateRangeChangeCallbacks.indexOf(callback);
        if (index > -1) {
          state.dateRangeChangeCallbacks.splice(index, 1);
          console.log(
            "Thrive Calendar Context: Unregistered callback, total callbacks:",
            state.dateRangeChangeCallbacks.length
          );
        }
      },
      setSelectedEvent(event: BaseCalendarEvent | null) {
        state.selectedEvent = event;
        document.dispatchEvent(
          new CustomEvent("thrive-calendar:selectedEvent", {
            detail: { contextId: state.id, event: state.selectedEvent },
          })
        );
      },
      registerCalendar(el: ThriveCalendarEl) {
        state.calendars.add(el);
      },
      unregisterCalendar(el: ThriveCalendarEl) {
        state.calendars.delete(el);
      },

      setView(view: CalendarView) {
        console.log("Thrive Calendar Context: setView called", view);
        state.view = view;
        // Drive registered calendars; they will emit range:change with UTC dates
        state.calendars.forEach((cal) => cal.setAttribute("view", view));
      },
      goToToday() {
        console.log("Thrive Calendar Context: goToToday called");
        state.anchor = new Date();
        const ymd = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
        state.calendars.forEach((cal) => cal.setAttribute("date", ymd));
      },
      navigate(direction: "next" | "prev") {
        console.log("Thrive Calendar Context: navigate called", direction);
        const dir = direction === "next" ? 1 : -1;
        state.calendars.forEach((cal) => {
          // Use current calendar UTC range to compute next anchor
          const from = cal.fromDate ? new Date(cal.fromDate) : new Date();
          const until = cal.untilDate ? new Date(cal.untilDate) : new Date();
          let next = from; // default
          if (state.view === "day") {
            next = new Date(from);
            next.setUTCDate(from.getUTCDate() + dir * 1);
          } else if (state.view === "week") {
            next = new Date(from);
            next.setUTCDate(from.getUTCDate() + dir * 7);
          } else if (state.view === "month") {
            // Approximate using until - from (exclusive range), or +30 days
            const days = Math.max(
              28,
              Math.round((until.getTime() - from.getTime()) / 86400000)
            );
            next = new Date(from);
            next.setUTCDate(from.getUTCDate() + dir * days);
          } else {
            next = new Date(from);
            next.setUTCDate(from.getUTCDate() + dir * 7);
          }
          const ymd = next.toISOString().slice(0, 10);
          cal.setAttribute("date", ymd);
          state.anchor = new Date(next);
        });
      },
      setAnchor(date: Date) {
        console.log("Thrive Calendar Context: setAnchor called", date);
        state.anchor = new Date(date);
        const ymd = new Date(date).toISOString().slice(0, 10);
        state.calendars.forEach((cal) => cal.setAttribute("date", ymd));
      },
      // client
      get thriveClient() {
        return thriveClient;
      },
      // readonly views
      get id() {
        return state.id;
      },
      get events() {
        return state.events;
      },
      get selectedEvent() {
        return state.selectedEvent;
      },
      get view() {
        return state.view;
      },
      get anchor() {
        return state.anchor;
      },
    };

    // Attach API to the context element for children to access via DOM traversal
    (ctxEl as any).__thriveCalCtxApi = api;
    // Also register globally by id for optional lookups
    const reg = getRegistry(document);
    reg[id] = api;

    // Minimal initial sync for any calendars inside this context.
    ctxEl
      .querySelectorAll<ThriveCalendarEl>("thrive-calendar")
      .forEach((cal) => {
        state.calendars.add(cal);
        if (Array.isArray(state.events)) cal.events = state.events;
        const dateAttr = cal.getAttribute("date");
        const oldAnchor = state.anchor;
        state.anchor = dateAttr ? new Date(dateAttr) : state.anchor;

        // Listen for range changes directly from the calendar (UTC dates)
        const onRangeChange = (e: Event) => {
          const detail = (e as CustomEvent).detail as
            | { fromDate?: string; untilDate?: string }
            | undefined;
          if (!detail?.fromDate || !detail?.untilDate) return;
          callDateRangeChangeCallbacks(
            state,
            new Date(detail.fromDate),
            new Date(detail.untilDate)
          );
        };
        cal.addEventListener("range:change", onRangeChange as EventListener);

        // Trigger initial callback run based on this calendar's current range
        if (cal.fromDate && cal.untilDate) {
          callDateRangeChangeCallbacks(
            state,
            new Date(cal.fromDate),
            new Date(cal.untilDate)
          );
        } else if (state.anchor.getTime() !== oldAnchor.getTime()) {
          emitCurrentRangeFromCalendars();
        }
      });
  }

  function onReady() {
    document
      .querySelectorAll<HTMLElement>(
        ".wp-block-custom-theme-thrive-calendar-context"
      )
      .forEach((el) => attachContext(el));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();

export {};
