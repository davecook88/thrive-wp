import { useEffect, useRef } from "@wordpress/element";

interface PreviewSectionProps {
  showPreviewWeeks: number;
  accentColor: string;
}

export default function PreviewSection({
  showPreviewWeeks,
  accentColor,
}: PreviewSectionProps) {
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderCalendar = () => {
      if (!calendarRef.current) return;

      // Wait for thrive-calendar to be defined
      if (
        typeof customElements !== "undefined" &&
        customElements.get("thrive-calendar")
      ) {
        calendarRef.current.innerHTML = `
          <thrive-calendar
            style="width: 100%; height: 100%;"
          ></thrive-calendar>
        `;
      } else {
        // Fallback if component not loaded
        calendarRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; background: #f8fafc; border-radius: 6px;">
            Calendar component not loaded. Please refresh the page.
          </div>
        `;
        // Try again in a moment
        setTimeout(renderCalendar, 1000);
      }
    };

    renderCalendar();
  }, []);

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
