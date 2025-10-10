import { usePackageBooking } from "../../../hooks/use-package-booking";
import type { Teacher } from "../../../../types/calendar";

export default function PackageBookingButton({
  pkg,
  selectedTeacher,
  event,
  bookingUrl,
}: {
  pkg: any;
  selectedTeacher: Teacher | null;
  event: any;
  bookingUrl: string | null;
}) {
  const { bookWithPackage, loading, success, error } = usePackageBooking();

  // Determine session identifier
  const sessionId = Number((event as any).sessionId || event.id);

  if (success) {
    return (
      <div style={{ textAlign: "right", fontWeight: 700, color: "green" }}>
        Booked ✓
      </div>
    );
  }

  return (
    <div>
      <button
        className="btn btn--book"
        type="button"
        onClick={async () => {
          if (!selectedTeacher) return;
          await bookWithPackage(pkg.id, sessionId);
        }}
        style={{
          border: "none",
          borderRadius: 50,
          padding: "8px 14px",
          fontWeight: 700,
          textDecoration: "none",
          background: selectedTeacher
            ? "var(--wp--preset--color--accent)"
            : "var(--wp--preset--color--gray-300)",
          color: selectedTeacher
            ? "var(--wp--preset--color--background)"
            : "var(--wp--preset--color--gray-700)",
          cursor: !selectedTeacher ? "not-allowed" : "pointer",
          opacity: loading ? 0.8 : 1,
        }}
        disabled={!selectedTeacher || loading}
      >
        {loading ? "Booking…" : "Book with package"}
      </button>
      {error ? (
        <div
          style={{ color: "var(--wp--preset--color--accent)", marginTop: 6 }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
