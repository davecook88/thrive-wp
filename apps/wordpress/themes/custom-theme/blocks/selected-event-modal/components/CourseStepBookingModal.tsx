import { useState, useEffect } from "@wordpress/element";
import {
  prettyDate,
  type UnbookedCourseStep,
  type CourseStepSessionOption,
} from "@thrive/shared";
import { thriveClient } from "../../../../../shared/thrive";

interface CourseStepBookingModalProps {
  packageId: number;
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  isModifying: boolean;
  onClose: () => void;
}

export default function CourseStepBookingModal({
  packageId,
  stepId,
  stepLabel,
  stepTitle,
  isModifying,
  onClose,
}: CourseStepBookingModalProps) {
  const [options, setOptions] = useState<CourseStepSessionOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStepOptions = async () => {
      try {
        // Fetch all unbooked steps using ThriveClient
        const allSteps = await thriveClient.getUnbookedCourseSteps(packageId);

        // Find the step we're looking for
        const currentStep = allSteps.find((s) => s.stepId === stepId);
        const data = currentStep?.options || [];

        // Auto-select single option
        if (data.length === 1) {
          setSelectedOptionId(data[0].courseStepOptionId);
        }
        setOptions(data);
      } catch (err: unknown) {
        console.error("Error fetching step options:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load options";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchStepOptions();
  }, [packageId, stepId, isModifying]);

  const handleSubmit = async () => {
    if (!selectedOptionId) return;

    setSubmitting(true);
    setError(null);

    try {
      if (isModifying) {
        // Change existing session using ThriveClient
        await thriveClient.changeCourseStepSession(
          packageId,
          stepId,
          selectedOptionId,
        );
      } else {
        // Book new session using ThriveClient
        await thriveClient.bookCourseStepSession(
          packageId,
          stepId,
          selectedOptionId,
        );
      }

      // Success! Dispatch event to refresh enrollments
      document.dispatchEvent(
        new CustomEvent("thrive-course:stepBooked", {
          detail: {
            packageId,
            stepId,
            success: true,
          },
        }),
      );

      onClose();
    } catch (err: unknown) {
      console.error("Booking error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to book session";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "32px",
          textAlign: "center",
          fontFamily: "var(--wp--preset--font-family--inter)",
        }}
      >
        <p>Loading options...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "32px",
          fontFamily: "var(--wp--preset--font-family--inter)",
        }}
      >
        <div
          style={{
            padding: "16px",
            backgroundColor: "#fee2e2",
            borderRadius: "8px",
            fontSize: "14px",
            color: "#991b1b",
            marginBottom: "16px",
          }}
        >
          ❌ {error}
        </div>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px 24px",
            backgroundColor: "#e5e7eb",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div
        style={{
          padding: "32px",
          textAlign: "center",
          fontFamily: "var(--wp--preset--font-family--inter)",
        }}
      >
        <p>No available options for this step.</p>
        <button
          onClick={onClose}
          style={{
            marginTop: "16px",
            padding: "12px 24px",
            backgroundColor: "#e5e7eb",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div
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
            fontSize: "24px",
            fontWeight: 700,
            margin: 0,
            marginBottom: "8px",
            color: "#111827",
          }}
        >
          {stepLabel}: {stepTitle}
        </h3>
        <p
          style={{
            margin: "8px 0 0 0",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          {isModifying
            ? "Select a different session for this step"
            : "Select your preferred session for this step"}
        </p>
      </div>

      {/* Options List */}
      <div style={{ flex: 1, overflowY: "auto", marginBottom: "24px" }}>
        {options.map((option) => {
          const availableSeats = option.spotsAvailable;
          const isFull = availableSeats === 0;

          return (
            <label
              key={option.courseStepOptionId}
              style={{
                display: "block",
                marginBottom: "12px",
                padding: "16px",
                border: selectedOptionId === option.courseStepOptionId ? "2px solid #3b82f6" : "1px solid #d1d5db",
                borderRadius: "8px",
                backgroundColor:
                  selectedOptionId === option.courseStepOptionId ? "#eff6ff" : "#ffffff",
                cursor: isFull ? "not-allowed" : "pointer",
                opacity: isFull ? 0.6 : 1,
                transition: "all 150ms ease",
              }}
            >
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <input
                  type="radio"
                  name="step-option"
                  value={option.courseStepOptionId}
                  checked={selectedOptionId === option.courseStepOptionId}
                  disabled={isFull}
                  onChange={() => setSelectedOptionId(option.courseStepOptionId)}
                  style={{ marginTop: "2px", cursor: isFull ? "not-allowed" : "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#111827",
                      marginBottom: "4px",
                    }}
                  >
                    {option.groupClassName}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    📅 {prettyDate(option.startAt)}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    👤 {option.teacherName}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: isFull ? "#dc2626" : "#10b981",
                      fontWeight: 600,
                    }}
                  >
                    {isFull ? (
                      "🔒 Session Full"
                    ) : (
                      <>
                        ✓ {availableSeats}{" "}
                        {availableSeats === 1 ? "spot" : "spots"} available
                      </>
                    )}
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={onClose}
          disabled={submitting}
          style={{
            padding: "12px 24px",
            backgroundColor: "#e5e7eb",
            color: "#111827",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={!selectedOptionId || submitting}
          style={{
            padding: "12px 24px",
            backgroundColor:
              !selectedOptionId || submitting ? "#d1d5db" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: !selectedOptionId || submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting
            ? "Booking..."
            : isModifying
              ? "Change Session"
              : "Book Session"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
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
          ❌ {error}
        </div>
      )}
    </div>
  );
}
