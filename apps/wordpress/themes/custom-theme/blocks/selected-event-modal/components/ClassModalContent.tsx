import { useState } from "@wordpress/element";
import { useStudentCredits } from "../../hooks/use-student-credits";
import {
  useCompatibleCredits,
  hasAnyCredits,
} from "../../hooks/use-compatible-credits";
import { usePackageBooking } from "../../hooks/use-package-booking";
import CreditSelectionModal from "./CreditSelectionModal";
import { ClassEvent, prettyDate } from "@thrive/shared";

export default function ClassModalContent({ event }: { event: ClassEvent }) {
  const teacher = event?.teacher;
  const level = event?.level;
  const capacityMax = event?.capacityMax;
  const enrolledCount = event?.enrolledCount ?? 0;
  const availableSpots = event?.availableSpots ?? capacityMax;
  const isFull = event?.isFull ?? false;
  const sessionId = Number(event?.sessionId);

  // State for credit selection modal
  const [showCreditModal, setShowCreditModal] = useState(false);

  // Legacy credit hook (for general info)
  const { totalRemaining, refetch: refetchCredits } = useStudentCredits();

  // New tier-aware credit hook
  const {
    compatible,
    loading: loadingCompatible,
    error: compatibleError,
  } = useCompatibleCredits(sessionId);

  // Package booking hook
  const {
    bookWithPackage,
    loading: bookingLoading,
    success: bookingSuccess,
    error: bookingError,
  } = usePackageBooking();

  const hasCompatibleCredits = hasAnyCredits(compatible);

  // Calculate session duration in minutes
  const sessionDuration =
    event?.startUtc && event?.endUtc
      ? Math.round(
          (new Date(event.endUtc).getTime() -
            new Date(event.startUtc).getTime()) /
            60000,
        )
      : 60; // default to 60 minutes if not available

  const handleBookClick = () => {
    // If no compatible credits available, go straight to payment
    if (!hasCompatibleCredits) {
      handlePayWithoutCredits();
      return;
    }

    // Show credit selection modal
    setShowCreditModal(true);
  };

  const handleSelectPackage = (
    packageId: number,
    allowanceId: number,
    requiresConfirmation: boolean,
  ) => {
    // If requires confirmation (cross-tier), show confirmation
    if (requiresConfirmation && compatible) {
      const pkg = compatible.higherTier.find((p) => p.id === packageId);
      if (pkg) {
        const confirmed = window.confirm(
          `${pkg.warningMessage}\n\nAre you sure you want to continue?`,
        );
        if (!confirmed) {
          return;
        }
      }
    }

    // Book with package credits (async, but don't return promise to modal)
    bookWithPackage({
      sessionId,
      studentPackageId: packageId,
      allowanceId,
      confirmed: requiresConfirmation, // Pass confirmation flag for cross-tier bookings
    })
      .then((result) => {
        if (result.ok) {
          // Close modal on success
          setShowCreditModal(false);
          // Refetch credits to update UI
          if (refetchCredits) {
            refetchCredits().catch(console.error);
          }
          // Dispatch event to refresh calendar data
          document.dispatchEvent(
            new CustomEvent("thrive:refresh-calendar-data"),
          );
        }
        // Errors are handled by the hook's error state
      })
      .catch((err) => {
        console.error("Booking error:", err);
      });
  };

  const handlePayWithoutCredits = () => {
    // Close modal and redirect to payment flow
    setShowCreditModal(false);

    // For now, redirect to a payment page (you can implement this later)
    // This could be a Stripe checkout or other payment flow
    alert(
      "Payment flow not yet implemented. This would redirect to Stripe checkout.",
    );
  };

  return (
    <div
      className="selected-event-modal__class"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--wp--preset--font-family--inter)",
        background: "var(--wp--preset--color--background)",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
        padding: "32px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h3
          style={{
            fontSize: "28px",
            fontWeight: 700,
            margin: 0,
            marginBottom: "8px",
            color: "#111827",
          }}
        >
          {event?.title}
        </h3>

        {/* Badges for group classes */}
        {
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            {level && (
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  backgroundColor:
                    "var(--wp--preset--color--accent-light, #f0fdf4)",
                  color: "var(--wp--preset--color--accent, #10b981)",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {level.code} - {level.name}
              </span>
            )}
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                backgroundColor: "#eff6ff",
                color: "#3b82f6",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Group Class
            </span>
          </div>
        }
      </div>

      {/* Details Box */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px" }}>📅</span>
            <div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>When</div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                {prettyDate(event?.startUtc)}
              </div>
              {event?.endUtc && (
                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                  Until {prettyDate(event.endUtc)}
                </div>
              )}
            </div>
          </div>

          {teacher && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>👨‍🏫</span>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  Teacher
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  {teacher.displayName}
                </div>
              </div>
            </div>
          )}

          {capacityMax && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>👥</span>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  Capacity
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  {enrolledCount} / {capacityMax} students enrolled
                </div>
                {availableSpots > 0 && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--wp--preset--color--accent, #10b981)",
                      fontWeight: 600,
                    }}
                  >
                    {availableSpots} spot{availableSpots !== 1 ? "s" : ""}{" "}
                    available
                  </div>
                )}
                {isFull && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#dc2626",
                      fontWeight: 600,
                    }}
                  >
                    Class is full
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {event?.description && (
        <div style={{ marginBottom: "24px" }}>
          <p style={{ color: "#374151", lineHeight: "1.6", margin: 0 }}>
            {event.description}
          </p>
        </div>
      )}

      {/* Success Message */}
      {bookingSuccess && (
        <div
          style={{
            marginTop: "16px",
            padding: "16px",
            backgroundColor: "#d1fae5",
            borderRadius: "8px",
            fontSize: "14px",
            color: "#065f46",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          ✓ Booking confirmed! The calendar will refresh shortly.
        </div>
      )}

      {/* Action Button */}
      <div style={{ marginTop: "auto" }}>
        {!isFull && !bookingSuccess && (
          // Booking button for group sessions
          <button
            onClick={handleBookClick}
            disabled={loadingCompatible || bookingLoading}
            style={{
              width: "100%",
              padding: "14px 24px",
              backgroundColor:
                loadingCompatible || bookingLoading
                  ? "#d1d5db"
                  : "var(--wp--preset--color--accent, #10b981)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: 600,
              cursor:
                loadingCompatible || bookingLoading ? "not-allowed" : "pointer",
              transition: "all 150ms ease",
            }}
          >
            {bookingLoading
              ? "Booking..."
              : loadingCompatible
                ? "Loading credits..."
                : hasCompatibleCredits
                  ? `Book with Credits (${totalRemaining} remaining)`
                  : "Book Now"}
          </button>
        )}
      </div>

      {/* Booking Error */}
      {bookingError && !bookingSuccess && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#fee2e2",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#991b1b",
          }}
        >
          ❌ {bookingError}
        </div>
      )}

      {/* Credits info - only show warning if error occurred */}
      {!isFull && compatibleError && !loadingCompatible && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#fef3c7",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#92400e",
          }}
        >
          ⚠️ {compatibleError.message}
        </div>
      )}

      {/* Credit Selection Modal */}
      {showCreditModal && compatible && (
        <CreditSelectionModal
          compatible={compatible}
          sessionDuration={sessionDuration}
          onSelectPackage={handleSelectPackage}
          onPayWithoutCredits={handlePayWithoutCredits}
          onCancel={() => setShowCreditModal(false)}
        />
      )}
    </div>
  );
}
