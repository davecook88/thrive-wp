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

// All API calls must go through thriveClient, which is exposed on the context.

// '.wp-block-custom-theme-thrive-calendar-context' wrapper.
(() => {
  // type CalEvent = {
  //   id: string;
  //   title: string;
  //   startUtc: string;
  //   endUtc: string;
  //   type: "availability" | "class" | "booking" | "blackout";
  //   teacherId?: string;
  //   [key: string]: any;
  // };

  // type SourceState = {
  //   events: CalEvent[];
  //   ranges: Set<string>; // fetched range keys
  // };

  // type Ctx = {
  //   id: string;
  //   selectedEvent?: any;
  //   events: CalEvent[];
  //   sources: Record<string, SourceState>;
  //   selectedTeacherId?: string;
  //   view?: "week" | "day" | "month" | "list";
  //   anchor?: Date;
  //   pending: Set<string>;
  // };

  const REG = Symbol("thriveCalRegistry");
  type RegMap = Record<string, ThriveCalendarContextApi>;
  function getRegistry(root: Document | ShadowRoot): RegMap {
    const win = window as any;
    if (!win[REG]) win[REG] = {} as RegMap;
    return win[REG] as RegMap;
  }

  function rangeKey(start: Date, end: Date) {
    return `${start.toISOString()}__${end.toISOString()}`;
  }

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
  };

  function mergeAllSources(state: CtxState) {
    const all: BaseCalendarEvent[] = [];
    for (const src of Object.values(state.sources)) all.push(...src.events);
    all.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
    state.events = all;
  }

  async function ensureRange(
    state: CtxState,
    source: string,
    start: Date,
    end: Date
  ) {
    const key = `${source}:${rangeKey(start, end)}`;
    if (state.pending.has(key)) return;
    const src = (state.sources[source] ||= { events: [], ranges: new Set() });
    const rKey = rangeKey(start, end);
    if (src.ranges.has(rKey)) return;

    state.pending.add(key);
    let events: BaseCalendarEvent[] = [];
    if (source === "teacher-availability") {
      events = await thriveClient.fetchAvailabilityPreview(start, end);
      if (state.selectedTeacherId) {
        events = events.map((e) => ({
          ...e,
          teacherId: state.selectedTeacherId,
        }));
      }
    }
    // Replace events in this exact range for the source
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const idsToRemove = new Set(
      src.events
        .filter((e) => e.startUtc >= startIso && e.endUtc <= endIso)
        .map((e) => e.id)
    );
    if (idsToRemove.size)
      src.events = src.events.filter((e) => !idsToRemove.has(e.id));
    src.events.push(...events);
    src.ranges.add(rKey);
    state.pending.delete(key);

    mergeAllSources(state);
    // Push to calendars under this context
    const el = document.getElementById(state.id);
    if (el)
      el.querySelectorAll<any>("thrive-calendar").forEach(
        (cal) => (cal.events = state.events)
      );
  }

  function attachContext(ctxEl: HTMLElement) {
    const registry = getRegistry(document);
    const id =
      ctxEl.getAttribute("id") ||
      `cal-ctx-${Math.random().toString(36).slice(2, 8)}`;
    if (!ctxEl.id) ctxEl.id = id;
    const selectedTeacherId =
      ctxEl.getAttribute("data-selected-teacher") || undefined;
    const state: CtxState = {
      id,
      events: [],
      selectedEvent: null,
      sources: {},
      selectedTeacherId,
      view: "week",
      anchor: new Date(),
      pending: new Set(),
    };

    // Initialize anchor and ensure current week is cached, even if no calendars
    const initRange = weekRangeFor(state.anchor);
    ensureRange(state, "teacher-availability", initRange.start, initRange.end);

    // Expose a context-local API for descendants via DOM property
    const api: ThriveCalendarContextApi = {
      // identity
      setEventsFromTeacherAvailability(
        startIso: string,
        endIso: string,
        events: BaseCalendarEvent[]
      ) {
        const src = (state.sources["teacher-availability"] ||= {
          events: [],
          ranges: new Set(),
        });
        const start = new Date(startIso);
        const end = new Date(endIso);
        const rKey = rangeKey(start, end);
        src.events = src.events.filter(
          (e) => !(e.startUtc >= startIso && e.endUtc <= endIso)
        );
        src.events.push(
          ...events.map((e) =>
            state.selectedTeacherId && !e.teacherId
              ? { ...e, teacherId: state.selectedTeacherId }
              : e
          )
        );
        src.ranges.add(rKey);
        mergeAllSources(state);
        const el = document.getElementById(state.id);
        if (el)
          el.querySelectorAll<any>("thrive-calendar").forEach(
            (cal) => (cal.events = state.events)
          );
      },
      setSelectedTeacherId(teacherId: string | undefined) {
        state.selectedTeacherId = teacherId;
      },
      setSelectedEvent(event: BaseCalendarEvent | null) {
        state.selectedEvent = event;
        document.dispatchEvent(
          new CustomEvent("thrive-calendar:selectedEvent", {
            detail: { contextId: state.id, event: state.selectedEvent },
          })
        );
      },
      ensureRange(start: Date, end: Date) {
        return ensureRange(state, "teacher-availability", start, end);
      },
      setView(view: CalendarView) {
        state.view = view;
        const { start, end } = weekRangeFor(state.anchor);
        void ensureRange(state, "teacher-availability", start, end);
      },
      goToToday() {
        state.anchor = new Date();
        const { start, end } = weekRangeFor(state.anchor);
        void ensureRange(state, "teacher-availability", start, end);
      },
      navigate(direction: "next" | "prev") {
        const dir = direction === "next" ? 1 : -1;
        const days = state.view === "week" ? 7 : state.view === "day" ? 1 : 7;
        const anchor = new Date(state.anchor);
        anchor.setDate(anchor.getDate() + dir * days);
        state.anchor = anchor;
        const { start, end } = weekRangeFor(anchor);
        void ensureRange(state, "teacher-availability", start, end);
      },
      setAnchor(date: Date) {
        state.anchor = new Date(date);
        const { start, end } = weekRangeFor(state.anchor);
        void ensureRange(state, "teacher-availability", start, end);
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
      get selectedTeacherId() {
        return state.selectedTeacherId;
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
      state.anchor = dateAttr ? new Date(dateAttr) : state.anchor;
      const { start, end } = weekRangeFor(state.anchor);
      ensureRange(state, "teacher-availability", start, end);
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
