// Thrive Calendar Context runtime. All logic and APIs are scoped to each
// '.wp-block-custom-theme-thrive-calendar-context' wrapper.
(() => {
  type CalEvent = {
    id: string;
    title: string;
    startUtc: string;
    endUtc: string;
    type: "availability" | "class" | "booking" | "blackout";
    teacherId?: string;
    [key: string]: any;
  };

  type SourceState = {
    events: CalEvent[];
    ranges: Set<string>; // fetched range keys
  };

  type Ctx = {
    id: string;
    selectedEvent?: any;
    events: CalEvent[];
    sources: Record<string, SourceState>;
    selectedTeacherId?: string;
    view?: "week" | "day" | "month" | "list";
    anchor?: Date;
    pending: Set<string>;
  };

  const REG = Symbol("thriveCalRegistry");
  type RegMap = Record<string, Ctx>;

  function getRegistry(root: Document | ShadowRoot): RegMap {
    const win = window as any;
    if (!win[REG]) win[REG] = {} as RegMap;
    return win[REG] as RegMap;
  }

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

  function rangeKey(start: Date, end: Date) {
    return `${start.toISOString()}__${end.toISOString()}`;
  }

  function mergeAllSources(ctx: Ctx) {
    const all: CalEvent[] = [];
    for (const src of Object.values(ctx.sources)) all.push(...src.events);
    all.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
    ctx.events = all;
  }

  async function fetchAvailabilityPreview(
    start: Date,
    end: Date
  ): Promise<CalEvent[]> {
    try {
      const res = await fetch(`/api/teachers/me/availability/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          start: start.toISOString(),
          end: end.toISOString(),
        }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        windows?: Array<{ start: string; end: string }>;
      };
      const wins = Array.isArray(data?.windows) ? data.windows : [];
      return wins.map((w) => ({
        id: `avail:${w.start}|${w.end}`,
        title: "Available",
        startUtc: w.start,
        endUtc: w.end,
        type: "availability",
      }));
    } catch (e) {
      console.warn("availability preview fetch failed", e);
      return [];
    }
  }

  async function ensureRange(ctx: Ctx, source: string, start: Date, end: Date) {
    const key = `${source}:${rangeKey(start, end)}`;
    if (ctx.pending.has(key)) return;
    const src = (ctx.sources[source] ||= { events: [], ranges: new Set() });
    const rKey = rangeKey(start, end);
    if (src.ranges.has(rKey)) return;

    ctx.pending.add(key);
    let events: CalEvent[] = [];
    if (source === "teacher-availability") {
      events = await fetchAvailabilityPreview(start, end);
      if (ctx.selectedTeacherId) {
        events = events.map((e) => ({
          ...e,
          teacherId: ctx.selectedTeacherId,
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
    ctx.pending.delete(key);

    mergeAllSources(ctx);
    // Push to calendars under this context
    const el = document.getElementById(ctx.id);
    if (el)
      el.querySelectorAll<any>("thrive-calendar").forEach(
        (cal) => (cal.events = ctx.events)
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
    const ctx: Ctx =
      registry[id] ||
      (registry[id] = {
        id,
        events: [],
        sources: {},
        selectedTeacherId,
        pending: new Set(),
      });
    // keep teacher id synced
    ctx.selectedTeacherId = selectedTeacherId;

    // Initialize anchor and ensure current week is cached, even if no calendars
    if (!ctx.anchor) ctx.anchor = new Date();
    const initRange = weekRangeFor(ctx.anchor);
    ensureRange(ctx, "teacher-availability", initRange.start, initRange.end);

    // Expose a context-local API for descendants via DOM property
    const api = {
      setEventsFromTeacherAvailability(
        startIso: string,
        endIso: string,
        events: CalEvent[]
      ) {
        const src = (ctx.sources["teacher-availability"] ||= {
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
            ctx.selectedTeacherId && !e.teacherId
              ? { ...e, teacherId: ctx.selectedTeacherId }
              : e
          )
        );
        src.ranges.add(rKey);
        mergeAllSources(ctx);
        const el = document.getElementById(ctx.id);
        if (el)
          el.querySelectorAll<any>("thrive-calendar").forEach(
            (cal) => (cal.events = ctx.events)
          );
      },
      ensureRange(start: Date, end: Date) {
        return ensureRange(ctx, "teacher-availability", start, end);
      },
      get id() {
        return ctx.id;
      },
    } as const;

    // Attach API to the context element for children to access via DOM traversal
    (ctxEl as any).__thriveCalCtxApi = api;

    // Attach calendars under this context
    ctxEl.querySelectorAll<any>("thrive-calendar").forEach((cal) => {
      // Initial sync
      if (Array.isArray(ctx.events)) cal.events = ctx.events;
      ctx.view = (cal.getAttribute("view") as any) || ctx.view || "week";
      const dateAttr = cal.getAttribute("date");
      ctx.anchor = dateAttr ? new Date(dateAttr) : ctx.anchor || new Date();
      const { start, end } = weekRangeFor(ctx.anchor);
      ensureRange(ctx, "teacher-availability", start, end);

      cal.addEventListener("event:click", (e: any) => {
        ctx.selectedEvent = e?.detail?.event || null;
        document.dispatchEvent(
          new CustomEvent("thrive-calendar:selectedEvent", {
            detail: { contextId: ctx.id, event: ctx.selectedEvent },
          })
        );
      });
      cal.addEventListener("today", () => {
        ctx.anchor = new Date();
        const { start, end } = weekRangeFor(ctx.anchor);
        ensureRange(ctx, "teacher-availability", start, end);
      });
      cal.addEventListener("navigate", (e: any) => {
        const dir = e?.detail?.direction === "next" ? 1 : -1;
        const days = ctx.view === "week" ? 7 : ctx.view === "day" ? 1 : 7;
        const anchor = ctx.anchor ? new Date(ctx.anchor) : new Date();
        anchor.setDate(anchor.getDate() + dir * days);
        ctx.anchor = anchor;
        const { start, end } = weekRangeFor(anchor);
        ensureRange(ctx, "teacher-availability", start, end);
      });
      cal.addEventListener("set-view", (e: any) => {
        const v = e?.detail?.view as Ctx["view"];
        if (!v) return;
        ctx.view = v;
        const anchor = ctx.anchor || new Date();
        const { start, end } = weekRangeFor(anchor);
        ensureRange(ctx, "teacher-availability", start, end);
      });
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
