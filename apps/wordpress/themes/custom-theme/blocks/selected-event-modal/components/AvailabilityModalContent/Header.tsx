import { useMemo } from "@wordpress/element";
import { buildBookingUrl } from "../../../../utils/booking";
import type { Teacher } from "../../../../types/calendar";

export default function Header({
  event,
  selectedTeacher,
}: {
  event: any;
  selectedTeacher: Teacher | null;
}) {
  return (
    <header
      style={{
        background: "var(--wp--preset--color--background)",
        flexShrink: 0,
        borderBottom: "1px solid var(--wp--preset--color--gray-200)",
      }}
    >
      <div
        style={{
          padding: "1.5rem 2rem",
          background: "var(--wp--preset--color--accent, #f97316)",
          color: "white",
        }}
      >
        <div
          style={{
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            fontWeight: 600,
            fontSize: "0.75rem",
            opacity: 0.95,
            marginBottom: "0.5rem",
          }}
        >
          Session
        </div>
        <div
          style={{
            fontSize: "1.35rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {event?.startLocal}
          {event?.endLocal ? ` — ${event.endLocal}` : ""}
        </div>
      </div>
    </header>
  );
}
