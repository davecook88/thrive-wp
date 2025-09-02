import { useEffect, useRef } from "@wordpress/element";

interface PreviewSectionProps {
  showPreviewWeeks: number;
  accentColor: string;
  // When this increments, refetch preview and update events
  refreshVersion?: number;
}

export default function PreviewSection({
  showPreviewWeeks,
  accentColor,
  refreshVersion = 0,
}: PreviewSectionProps) {
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ensureCalendarAndFetch = async () => {
      if (!calendarRef.current) return;

      const mountCalendar = () => {
        const el = document.createElement("thrive-calendar") as any;
        el.style.width = "100%";
        el.style.height = "100%";
        // Theme availability color subtly using accent
        el.setAttribute("availability-bg", `${accentColor}20`);
        calendarRef.current!.replaceChildren(el);
        return el as unknown as HTMLElement & { events?: unknown };
      };

      // Wait until the custom element is defined
      const ready =
        typeof customElements !== "undefined" &&
        !!customElements.get("thrive-calendar");
      const calendarEl = ready ? mountCalendar() : null;
      if (!ready) {
        // Retry soon while the component loader finishes
        setTimeout(ensureCalendarAndFetch, 500);
        return;
      }

      // Compute preview range
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + showPreviewWeeks * 7 - 1);
      end.setHours(23, 59, 59, 999);

      try {
        const res = await fetch("/api/teachers/me/availability/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            start: start.toISOString(),
            end: end.toISOString(),
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: { windows: Array<{ start: string; end: string }> } =
          await res.json();
        console.log("preview data", data);

        const events = (data.windows || []).map((w, idx) => ({
          id: String(idx + 1),
          title: "Available",
          startUtc: w.start,
          endUtc: w.end,
          type: "availability",
        }));

        console.log("events", events);

        // Inject events into the web component
        const cal = (calendarRef.current!.firstElementChild ||
          calendarEl) as any;
        if (cal) {
          cal.events = events;
        }
      } catch (e) {
        // Show a friendly fallback
        if (calendarRef.current) {
          calendarRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444; background: #fef2f2; border-radius: 6px;">
              Failed to load preview.
            </div>
          `;
        }
        // eslint-disable-next-line no-console
        console.error("Failed to fetch availability preview", e);
      }
    };

    ensureCalendarAndFetch();
  }, [showPreviewWeeks, accentColor, refreshVersion]);

  return (
    <div
      className="preview-section"
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px",
      }}
    >
      <h4 style={{ marginTop: 0, color: "#374151" }}>
        Preview (Next {showPreviewWeeks} Week{showPreviewWeeks > 1 ? "s" : ""})
      </h4>
      <div
        ref={calendarRef}
        style={{
          height: "400px",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
        }}
      >
        Loading calendar preview...
      </div>
    </div>
  );
}
