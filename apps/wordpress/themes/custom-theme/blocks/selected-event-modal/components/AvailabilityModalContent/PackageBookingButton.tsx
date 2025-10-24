import { PublicTeacherDto } from "@thrive/shared";
import { usePackageBooking } from "../../../hooks/use-package-booking";
import type { AvailabilityEvent } from "@thrive/shared/calendar";
import {
  StudentPackage,
  PackageAllowance,
} from "@thrive/shared/types/packages";

export default function PackageBookingButton({
  pkg,
  allowance,
  selectedTeacher,
  event,
  bookingUrl,
  onBookingSuccess,
}: {
  pkg: StudentPackage;
  allowance: PackageAllowance;
  selectedTeacher: PublicTeacherDto | null;
  event: AvailabilityEvent;
  bookingUrl: string | null;
  onBookingSuccess?: () => Promise<void>;
}) {
  const { bookWithPackage, loading, success, error } = usePackageBooking();

  console.log({ pkg, selectedTeacher, event, bookingUrl });

  if (success) {
    return (
      <div style={{ textAlign: "right", fontWeight: 700, color: "green" }}>
        Booked ✓
      </div>
    );
  }

  const onClick = async () => {
    if (!selectedTeacher) return;
    const result = await bookWithPackage({
      studentPackageId: pkg.id,
      allowanceId: allowance.id,
      bookingData: {
        teacherId: selectedTeacher.id,
        endAt: event.endUtc,
        startAt: event.startUtc,
      },
    });

    // If successful, trigger refetch callbacks
    if (result.ok) {
      // Refetch package credits
      await onBookingSuccess?.();

      // Dispatch event to refresh calendar data
      document.dispatchEvent(new CustomEvent("thrive:refresh-calendar-data"));
    }
    return;
  };

  return (
    <div>
      <button
        className="btn btn--book"
        type="button"
        onClick={() => {
          onClick().catch(console.error);
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
