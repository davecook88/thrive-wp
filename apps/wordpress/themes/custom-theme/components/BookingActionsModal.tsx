import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Modal, Button } from "@wordpress/components";

interface BookingActionsModalProps {
  bookingId: number;
  sessionTitle: string;
  sessionDate: string;
  sessionTime: string;
  teacherName: string;
  onClose: () => void;
  onRefresh?: () => void;
}

interface BookingPermissions {
  canCancel: boolean;
  canReschedule: boolean;
  reason?: string;
  hoursUntilSession: number;
}

const BookingActionsModal: React.FC<BookingActionsModalProps> = ({
  bookingId,
  sessionTitle,
  sessionDate,
  sessionTime,
  teacherName,
  onClose,
  onRefresh,
}) => {
  const [permissions, setPermissions] = useState<BookingPermissions | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/can-modify`);
        if (response.ok) {
          const data = await response.json();
          setPermissions(data);
        } else {
          console.error("Failed to fetch booking permissions");
        }
      } catch (error) {
        console.error("Error fetching booking permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [bookingId]);

  const handleCancel = async () => {
    const confirmed = confirm(
      "Are you sure you want to cancel this booking?\n\n" +
        "Your credit will be refunded to your package."
    );

    if (!confirmed) return;

    // Optional: Ask for reason
    const reason = prompt("Reason for cancellation (optional):");

    setCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          "✅ Booking cancelled successfully!" +
            (result.creditRefunded ? "\nYour credit has been refunded." : "")
        );
        onRefresh?.();
        onClose();
      } else {
        alert(
          "❌ Failed to cancel booking: " + (result.error || "Unknown error")
        );
      }
    } catch (error: any) {
      alert("❌ Connection failed: " + error.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleReschedule = () => {
    // For now, just show a message. Full reschedule flow would be implemented next
    alert("Reschedule functionality will be implemented in the next phase.");
  };

  if (loading) {
    return (
      <Modal title="Booking Details" onRequestClose={onClose}>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Booking Details" onRequestClose={onClose}>
      <div className="booking-details-modal p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">{sessionTitle}</h3>
          <p className="text-gray-600 mb-1">
            📅 {sessionDate} at {sessionTime}
          </p>
          <p className="text-gray-600 mb-3">👨‍🏫 Teacher: {teacherName}</p>
        </div>

        <div className="booking-actions space-y-3">
          {/* Cancel Button */}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              isDestructive
              onClick={handleCancel}
              disabled={!permissions?.canCancel || cancelling}
              className="w-full"
            >
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </div>

          {/* Reschedule Button */}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={handleReschedule}
              disabled={!permissions?.canReschedule}
              className="w-full"
            >
              Reschedule
            </Button>
          </div>

          {/* Status message if actions disabled */}
          {permissions?.reason && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-yellow-800 text-sm">ℹ️ {permissions.reason}</p>
            </div>
          )}

          {/* Countdown */}
          {permissions?.canCancel && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-blue-800 text-sm">
                ⏰ You have {permissions.hoursUntilSession} hours remaining to
                modify this booking
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Global function to show the modal
export function showBookingActionsModal(props: BookingActionsModalProps) {
  const modalContainer = document.createElement("div");
  modalContainer.id = "booking-actions-modal-container";
  document.body.appendChild(modalContainer);

  const root = createRoot(modalContainer);

  const handleClose = () => {
    root.unmount();
    document.body.removeChild(modalContainer);
  };

  root.render(<BookingActionsModal {...props} onClose={handleClose} />);
}

export default BookingActionsModal;
