import { useState } from "@wordpress/element";
import type { AvailabilityEvent } from "@thrive/shared/calendar";
import { ServiceType } from "@thrive/shared";
import { useGetTeachers } from "../../../hooks/get-teachers";
import { useStudentCredits } from "../../../hooks/use-student-credits";
import {
  useCompatibleCreditsForBooking,
  hasAnyCredits,
} from "../../../hooks/use-compatible-credits-for-booking";
import { usePackageBooking } from "../../../hooks/use-package-booking";
import { buildBookingUrl } from "../../../../utils/booking";

import Header from "./Header";
import TeacherSelectionPanel from "./TeacherSelectionPanel";
import TeacherInfoPanel from "./TeacherInfoPanel";
import { PublicTeacherDto } from "@thrive/shared";
import CreditSelectionModal from "../CreditSelectionModal";

export default function AvailabilityModalContent({
  event,
}: {
  event: AvailabilityEvent;
}) {
  const { loading: loadingTeachers, teachers } = useGetTeachers();

  // Legacy credit hook (for general info - total remaining)
  const { totalRemaining, refetch: refetchCredits } = useStudentCredits();

  const [selectedTeacher, setSelectedTeacher] =
    useState<PublicTeacherDto | null>(null);

  // State for credit selection modal
  const [showCreditModal, setShowCreditModal] = useState(false);

  // New tier-aware credit hook for selected teacher
  const {
    compatible,
    loading: loadingCompatible,
    error: compatibleError,
  } = useCompatibleCreditsForBooking(
    selectedTeacher ? ServiceType.PRIVATE : null,
    selectedTeacher?.tier ?? null,
  );

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

  const bookingConfirmationUrl = selectedTeacher
    ? (() => {
        try {
          return buildBookingUrl({
            startUtc: event.startUtc,
            endUtc: event.endUtc,
            teacherId: selectedTeacher.id,
            serviceType: event.type === "availability" ? "PRIVATE" : event.type,
          });
        } catch (error) {
          console.log("Error building booking URL", error);
          return null;
        }
      })()
    : null;

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
    if (!selectedTeacher) return;

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
      studentPackageId: packageId,
      allowanceId,
      confirmed: requiresConfirmation, // Pass confirmation flag for cross-tier bookings
      bookingData: {
        teacherId: selectedTeacher.id,
        endAt: event.endUtc,
        startAt: event.startUtc,
      },
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
    if (bookingConfirmationUrl) {
      window.location.href = bookingConfirmationUrl;
    } else {
      alert(
        "Payment flow not yet implemented. This would redirect to Stripe checkout.",
      );
    }
  };

  return (
    <div
      className="selected-event-modal__availability"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--wp--preset--font-family--inter)",
        background: "var(--wp--preset--color--background)",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
        overflow: "hidden",
      }}
    >
      {/* Fixed Header with Booking Information */}
      <Header event={event} />

      {/* Main Content Area with Side-by-Side Layout */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0, // Important for flex children to respect overflow
        }}
      >
        {/* Left Side - Teacher Selection */}
        <TeacherSelectionPanel
          teachers={teachers}
          selectedTeacher={selectedTeacher}
          onTeacherSelect={setSelectedTeacher}
          loading={loadingTeachers}
          availableTeacherCount={event?.teacherIds?.length ?? 0}
        />

        {/* Right Side - Teacher Information */}
        <TeacherInfoPanel selectedTeacher={selectedTeacher} />
      </div>

      {/* Fixed Footer - Book Now Button */}
      <div
        style={{
          padding: "24px",
          borderTop: "1px solid var(--wp--preset--color--gray-200)",
          backgroundColor: "var(--wp--preset--color--background)",
        }}
      >
        {bookingSuccess && (
          <div
            style={{
              marginBottom: "16px",
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

        {!selectedTeacher && (
          <div
            style={{
              fontSize: "14px",
              color: "#6b7280",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            Select a teacher to continue
          </div>
        )}

        {selectedTeacher && hasCompatibleCredits && !loadingCompatible && (
          <div
            style={{
              fontSize: "14px",
              color: "#374151",
              textAlign: "center",
              marginBottom: "12px",
            }}
          >
            {(() => {
              const totalCredits =
                (compatible?.exactMatch || []).reduce(
                  (sum, pkg) => sum + pkg.remainingSessions,
                  0,
                ) +
                (compatible?.higherTier || []).reduce(
                  (sum, pkg) => sum + pkg.remainingSessions,
                  0,
                );

              return (
                <>
                  You have <strong>{totalCredits}</strong> compatible private
                  credit
                  {totalCredits !== 1 ? "s" : ""} available
                </>
              );
            })()}
          </div>
        )}

        {selectedTeacher &&
          !hasCompatibleCredits &&
          !loadingCompatible &&
          totalRemaining > 0 && (
            <div
              style={{
                fontSize: "14px",
                color: "#92400e",
                backgroundColor: "#fef3c7",
                padding: "12px",
                borderRadius: "8px",
                textAlign: "center",
                marginBottom: "12px",
              }}
            >
              You have {totalRemaining} credit{totalRemaining !== 1 ? "s" : ""},
              but none are compatible with private sessions. Purchase a private
              credit package to book.
            </div>
          )}

        <button
          onClick={handleBookClick}
          disabled={
            !selectedTeacher ||
            loadingCompatible ||
            bookingLoading ||
            !!bookingSuccess
          }
          style={{
            width: "100%",
            padding: "14px 24px",
            backgroundColor:
              !selectedTeacher || loadingCompatible || bookingLoading
                ? "#d1d5db"
                : "var(--wp--preset--color--accent, #10b981)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 600,
            cursor:
              !selectedTeacher ||
              loadingCompatible ||
              bookingLoading ||
              bookingSuccess
                ? "not-allowed"
                : "pointer",
            transition: "all 150ms ease",
          }}
        >
          {bookingLoading
            ? "Booking..."
            : loadingCompatible
              ? "Loading credits..."
              : hasCompatibleCredits
                ? "Book with Credits"
                : "Book Now"}
        </button>

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
        {compatibleError && !loadingCompatible && (
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
      </div>

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
