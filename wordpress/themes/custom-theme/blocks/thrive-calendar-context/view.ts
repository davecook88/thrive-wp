// Thrive Calendar Context runtime. All logic and APIs are scoped to each

import type {
  ThriveCalendarContextApi,
  BaseCalendarEvent,
  CalendarView,
} from "../../types/calendar";
import { thriveClient } from "../../clients/thrive";

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
    };

    // Initialize anchor and ensure current week is cached, even if no calendars
    const initRange = weekRangeFor(state.anchor);
    // ensureRange(state, "teacher-availability", initRange.start, initRange.end);
    callDateRangeChangeCallbacks(state, initRange.start, initRange.end);

    // Expose a context-local API for descendants via DOM property
    const api: ThriveCalendarContextApi = {
      setSelectedTeacherId(teacherId: string | undefined) {
        state.selectedTeacherId = teacherId;
      },
      registerDateRangeChangeCallback(callback: DateRangeChangeCallback) {
        if (!state.dateRangeChangeCallbacks.includes(callback)) {
          state.dateRangeChangeCallbacks.push(callback);
          // call callback immediately for current range
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

      setView(view: CalendarView) {
        console.log("Thrive Calendar Context: setView called", view);
        state.view = view;
        const { start, end } = weekRangeFor(state.anchor);
        callDateRangeChangeCallbacks(state, start, end);
      },
      goToToday() {
        console.log("Thrive Calendar Context: goToToday called");
        state.anchor = new Date();
        const { start, end } = weekRangeFor(state.anchor);
        callDateRangeChangeCallbacks(state, start, end);
      },
      navigate(direction: "next" | "prev") {
        console.log("Thrive Calendar Context: navigate called", direction);
        const dir = direction === "next" ? 1 : -1;
        const days = state.view === "week" ? 7 : state.view === "day" ? 1 : 7;
        const anchor = new Date(state.anchor);
        anchor.setDate(anchor.getDate() + dir * days);
        state.anchor = anchor;
        const { start, end } = weekRangeFor(anchor);
        callDateRangeChangeCallbacks(state, start, end);
      },
      setAnchor(date: Date) {
        console.log("Thrive Calendar Context: setAnchor called", date);
        state.anchor = new Date(date);
        const { start, end } = weekRangeFor(state.anchor);
        callDateRangeChangeCallbacks(state, start, end);
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
    ctxEl.querySelectorAll<any>("thrive-calendar").forEach((cal) => {
      if (Array.isArray(state.events)) cal.events = state.events;
      const dateAttr = cal.getAttribute("date");
      const oldAnchor = state.anchor;
      state.anchor = dateAttr ? new Date(dateAttr) : state.anchor;
      if (state.anchor.getTime() !== oldAnchor.getTime()) {
        const { start, end } = weekRangeFor(state.anchor);
        callDateRangeChangeCallbacks(state, start, end);
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
