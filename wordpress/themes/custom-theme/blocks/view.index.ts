// Frontend view entry: import any block view scripts that need to run on the site
import "./thrive-calendar-modal/view";
import "./teacher-availability/view";
import "./thrive-calendar-context/view";
import "./selected-event-modal/view";
// Basic runtime for calendar context: demo plumbing; in a follow-up we can expand to fetch API
(() => {
  type Ctx = {
    selectedEvent?: any;
    events?: any[];
  };
  const registry: Record<string, Ctx> = (window as any)._thriveCalCtx || {};
  (window as any)._thriveCalCtx = registry;

  document.addEventListener("DOMContentLoaded", () => {
    // Initialize contexts based on wrapper presence
    document
      .querySelectorAll<HTMLElement>(
        ".wp-block-custom-theme-thrive-calendar-context"
      )
      .forEach((el, idx) => {
        const id = el.getAttribute("id") || `cal-ctx-${idx + 1}`;
        if (!el.id) el.id = id;
        registry[id] = registry[id] || {};
      });

    // Wire calendars to consume events from nearest context ancestor if available
    document.querySelectorAll<any>("thrive-calendar").forEach((cal) => {
      const ctxEl = cal.closest(
        ".wp-block-custom-theme-thrive-calendar-context"
      ) as HTMLElement | null;
      if (!ctxEl) return;
      const ctx = registry[ctxEl.id] || (registry[ctxEl.id] = {});
      // If context already has events, pass them down
      if (Array.isArray(ctx.events)) {
        cal.events = ctx.events;
      }
      // Listen for event-clicks emitted by the WC and store in context
      cal.addEventListener("event-click", (e: any) => {
        ctx.selectedEvent = e?.detail?.event || null;
        document.dispatchEvent(
          new CustomEvent("thrive-calendar:selectedEvent", {
            detail: { contextId: ctxEl.id, event: ctx.selectedEvent },
          })
        );
      });
    });
  });
})();
