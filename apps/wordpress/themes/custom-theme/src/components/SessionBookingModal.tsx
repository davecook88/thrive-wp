import React, { useEffect } from "react";
import SessionSelectionWizard from "../../blocks/session-selection-wizard/components/SessionSelectionWizard";

interface SessionBookingModalProps {
  packageId: number;
  onClose: () => void;
}

export default function SessionBookingModal({
  packageId,
  onClose,
}: SessionBookingModalProps) {
  useEffect(() => {
    // Prevent body scroll when modal open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <SessionSelectionWizard
          packageId={packageId}
          onComplete={onClose}
        />
      </div>
    </div>
  );
}
