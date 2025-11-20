import { useEffect, useState } from "react";

interface SessionSelectionWizardProps {
  stripeSessionId?: string;
  packageId?: number;
  onComplete?: () => void;
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
  spotsAvailable?: number;
  isActive: boolean;
  startAt?: string;
  endAt?: string;
}

export default function SessionSelectionWizard({
  stripeSessionId,
  packageId: propPackageId,
  onComplete,
}: SessionSelectionWizardProps) {
  const [packageId, setPackageId] = useState<number | null>(propPackageId || null);
  const [courseInfo, setCourseInfo] = useState<{
    courseCode?: string;
    cohortName?: string;
  } | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnrollmentData = async () => {
      try {
        let currentPackageId = propPackageId;

        // If we have a stripe session, fetch the package ID from it
        if (stripeSessionId && !currentPackageId) {
          const sessionResponse = await fetch(
            `/api/course-programs/enrollment/session/${stripeSessionId}`,
            {
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            },
          );

          if (!sessionResponse.ok) {
            throw new Error(
              `Failed to fetch enrollment data: ${sessionResponse.statusText}`,
            );
          }

          const sessionData = (await sessionResponse.json()) as {
            packageId: number;
            courseProgramId?: number;
            cohortId?: number;
            courseCode?: string;
            cohortName?: string;
          };

          currentPackageId = sessionData.packageId;
          setPackageId(currentPackageId);
          setCourseInfo({
            courseCode: sessionData.courseCode,
            cohortName: sessionData.cohortName,
          });
        }

        if (!currentPackageId) {
           // If we didn't get a package ID from props or stripe session, we can't proceed
           // But if we are just loading initially and propPackageId might be null, we should wait?
           // Actually, if propPackageId is passed, we use it. If not, and no stripeSessionId, it's an error or we wait.
           if (!stripeSessionId) {
             throw new Error("No package ID or Stripe session provided");
           }
           return; 
        }

        // Try to get steps that need booking (endpoint may not exist yet)
        try {
          const stepsResponse = await fetch(
            `/api/students/me/course-packages/${currentPackageId}/unbooked-steps`,
            {
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            },
          );

          if (stepsResponse.ok) {
            const stepsData = (await stepsResponse.json()) as Step[];
            setSteps(stepsData);

            // Auto-select single-option steps
            const initialSelections: Record<number, number> = {};
            stepsData.forEach((step) => {
              if (step.options.length === 1) {
                initialSelections[step.stepId] =
                  step.options[0].courseStepOptionId;
              }
            });
            if (Object.keys(initialSelections).length > 0) {
              setSelections(initialSelections);
            }
          } else {
            console.log("Unbooked steps endpoint not implemented yet");
            setSteps([]);
          }
        } catch {
          console.log("Unbooked steps endpoint not implemented yet");
          // This is okay - just means we don't have steps to show
          setSteps([]);
        }

        setError(null);
      } catch (err: unknown) {
        console.error("Error fetching enrollment data:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load enrollment data";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchEnrollmentData();
  }, [stripeSessionId, propPackageId]);

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

      const response = await fetch(
        `/api/students/me/course-packages/${packageId}/book-sessions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selections: selectionsArray }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to book sessions: ${response.statusText}`);
      }

      // Success!
      if (onComplete) {
        onComplete();
      } else {
        window.location.href = "/student";
      }
    } catch (err: unknown) {
      console.error("Booking error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to book sessions. Please try again from your dashboard.";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete();
    } else {
      // Allow skipping, can book later from student dashboard
      window.location.href = "/student";
    }
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

  // Steps that need user selection (more than 1 option)
  const stepsNeedingSelection = steps.filter((step) => step.options.length > 1);
  // All unbooked steps (including those with single options that are auto-selected)
  const allSelected = steps.every(
    (step) => selections[step.stepId],
  );

  return (
    <div className="session-wizard">
      {courseInfo && (
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              margin: "0 0 1rem 0",
              fontSize: "1.5rem",
              color: "#1f2937",
            }}
          >
            Enrollment Confirmed! ✅
          </h2>
          <div style={{ fontSize: "1rem", color: "#4b5563" }}>
            <p style={{ margin: "0.5rem 0" }}>
              <strong>Course:</strong> {courseInfo.courseCode || "Loading..."}
            </p>
            <p style={{ margin: "0.5rem 0" }}>
              <strong>Cohort:</strong> {courseInfo.cohortName || "Loading..."}
            </p>
          </div>
        </div>
      )}

      <h2 className="session-wizard__title">Book Your Sessions</h2>

      {steps.length === 0 ? (
        <div className="session-wizard__success">
          <p>Your enrollment is complete! You can view your course and book sessions from your dashboard.</p>
          <button
            onClick={() => (window.location.href = "/student")}
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
            {steps.map((step) => (
              <div key={step.stepId} className="wizard-step">
                <h3 className="wizard-step__title">
                  {step.stepLabel}: {step.stepTitle}
                </h3>

                <div className="wizard-step__options">
                  {step.options.map((option) => {
                    const formatDateTime = (isoString?: string) => {
                      if (!isoString) return "";
                      const date = new Date(isoString);
                      return new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZoneName: "short",
                      }).format(date);
                    };

                    const spotsAvailable =
                      option.spotsAvailable !== undefined
                        ? option.spotsAvailable
                        : option.capacityMax;
                    const isFull = spotsAvailable === 0;

                    return (
                      <label
                        key={option.courseStepOptionId}
                        className={`option-card ${
                          selections[step.stepId] === option.courseStepOptionId
                            ? "option-card--selected"
                            : ""
                        } ${isFull ? "option-card--full" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`step-${step.stepId}`}
                          value={option.courseStepOptionId}
                          checked={
                            selections[step.stepId] ===
                            option.courseStepOptionId
                          }
                          disabled={isFull}
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
                          {option.startAt && (
                            <div className="option-card__time">
                              📅 {formatDateTime(option.startAt)}
                            </div>
                          )}
                          <div
                            className="option-card__capacity"
                            style={{
                              color: isFull
                                ? "#dc2626"
                                : spotsAvailable < 3
                                  ? "#f59e0b"
                                  : "#10b981",
                              fontWeight: 600,
                            }}
                          >
                            {isFull ? (
                              "🔒 Session Full"
                            ) : (
                              <>
                                ✓ {spotsAvailable}{" "}
                                {spotsAvailable === 1 ? "spot" : "spots"} left
                              </>
                            )}
                          </div>
                          {!option.isActive && (
                            <div className="option-card__inactive">
                              (Currently inactive)
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="session-wizard__actions">
            <button onClick={handleSkip} className="button button--secondary">
              Book Later
            </button>
            <button
              onClick={() => void handleSubmit()}
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
