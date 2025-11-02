import React, { useEffect, useState } from "react";
import { thriveClient, ThriveApiError } from "@thrive/shared";

interface SessionSelectionWizardProps {
  stripeSessionId: string;
}

interface Step {
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  stepOrder: number;
  options: StepOption[];
}

interface StepOption {
  courseStepOptionId: number;
  groupClassId: number;
  groupClassName: string;
  capacityMax: number;
  isActive: boolean;
}

export default function SessionSelectionWizard({
  stripeSessionId,
}: SessionSelectionWizardProps) {
  const [packageId, setPackageId] = useState<number | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnrollmentData = async () => {
      try {
        // Get package ID from Stripe session
        const sessionData = await thriveClient.request<{
          packageId: number;
          courseProgramId?: number;
          cohortId?: number;
          courseCode?: string;
          cohortName?: string;
        }>(`/course-programs/enrollment/session/${stripeSessionId}`);

        setPackageId(sessionData.packageId);

        // Get steps that need booking
        const stepsData = await thriveClient.request<Step[]>(
          `/students/me/course-packages/${sessionData.packageId}/unbooked-steps`,
        );

        setSteps(stepsData);
        setError(null);
      } catch (err: unknown) {
        console.error("Error fetching enrollment data:", err);
        const errorMessage =
          err instanceof ThriveApiError
            ? err.message
            : "Failed to load enrollment data";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (stripeSessionId) {
      void fetchEnrollmentData();
    }
  }, [stripeSessionId]);

  const handleSelectionChange = (stepId: number, optionId: number) => {
    setSelections((prev) => ({ ...prev, [stepId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!packageId) return;

    setSubmitting(true);

    try {
      const selectionsArray = Object.entries(selections).map(
        ([stepId, optionId]) => ({
          courseStepId: parseInt(stepId),
          courseStepOptionId: optionId,
        }),
      );

      await thriveClient.request(
        `/students/me/course-packages/${packageId}/book-sessions`,
        {
          method: "POST",
          body: JSON.stringify({ selections: selectionsArray }),
        },
      );

      // Success! Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      console.error("Booking error:", err);
      const errorMessage =
        err instanceof ThriveApiError
          ? err.message
          : "Failed to book sessions. Please try again from your dashboard.";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Allow skipping, can book later from dashboard
    window.location.href = "/dashboard";
  };

  if (loading) {
    return <div className="session-wizard loading">Loading your course...</div>;
  }

  if (error) {
    return (
      <div className="session-wizard error">
        <p>{error}</p>
        <button onClick={handleSkip} className="button">
          Go to Dashboard
        </button>
      </div>
    );
  }

  const stepsNeedingSelection = steps.filter((step) => step.options.length > 1);
  const allSelected = stepsNeedingSelection.every((step) => selections[step.stepId]);

  return (
    <div className="session-wizard">
      <h2 className="session-wizard__title">Book Your Sessions</h2>

      {stepsNeedingSelection.length === 0 ? (
        <div className="session-wizard__success">
          <p>All sessions have been automatically booked!</p>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="button"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          <p className="session-wizard__description">
            Select your preferred time for each session:
          </p>

          <div className="session-wizard__steps">
            {stepsNeedingSelection.map((step) => (
              <div key={step.stepId} className="wizard-step">
                <h3 className="wizard-step__title">
                  {step.stepLabel}: {step.stepTitle}
                </h3>

                <div className="wizard-step__options">
                  {step.options.map((option) => (
                    <label
                      key={option.courseStepOptionId}
                      className={`option-card ${
                        selections[step.stepId] === option.courseStepOptionId
                          ? "option-card--selected"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`step-${step.stepId}`}
                        value={option.courseStepOptionId}
                        checked={
                          selections[step.stepId] === option.courseStepOptionId
                        }
                        onChange={() =>
                          handleSelectionChange(
                            step.stepId,
                            option.courseStepOptionId,
                          )
                        }
                      />
                      <div className="option-card__content">
                        <div className="option-card__name">
                          {option.groupClassName}
                        </div>
                        <div className="option-card__capacity">
                          Capacity: {option.capacityMax} students
                        </div>
                        {!option.isActive && (
                          <div className="option-card__inactive">
                            (Currently inactive)
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="session-wizard__actions">
            <button onClick={handleSkip} className="button button--secondary">
              Book Later
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allSelected || submitting}
              className="button button--primary"
            >
              {submitting ? "Booking..." : "Confirm Selections"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
