import { useCallback, useEffect, useState } from "react";
import type { StudentCoursePackage } from "@thrive/shared";

interface StudentCourseEnrollmentsProps {
  showProgress?: boolean;
}

interface StepAction {
  stepId: number;
  action: "book" | "modify" | "none";
  canModify: boolean;
}

export default function StudentCourseEnrollments({
  showProgress = true,
}: StudentCourseEnrollmentsProps) {
  const [enrollments, setEnrollments] = useState<StudentCoursePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepActions, setStepActions] = useState<Map<number, StepAction>>(
    new Map(),
  );

  // Extract fetch logic into a reusable function
  const fetchEnrollments = useCallback(async () => {
    try {
      const response = await fetch("/api/students/me/enrollments", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch enrollments");
      }

      const data = (await response.json()) as StudentCoursePackage[];
      setEnrollments(data);

      // Determine action for each step
      const actions = new Map<number, StepAction>();
      data.forEach((enrollment) => {
        enrollment.progress.forEach((step) => {
          let action: "book" | "modify" | "none" = "none";
          let canModify = false;

          if (step.status === "UNBOOKED") {
            action = "book";
          } else if (step.status === "BOOKED") {
            // Check if cancellation window is still open
            // For now, we'll assume it's modifiable if booked
            // This can be enhanced with actual cancellation window logic
            canModify = true;
            action = "modify";
          }

          actions.set(step.stepId, {
            stepId: step.stepId,
            action,
            canModify,
          });
        });
      });

      setStepActions(actions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    void fetchEnrollments();
  }, [fetchEnrollments]);

  // Listen for step booking events to auto-refresh
  useEffect(() => {
    const handleStepBooked = (event: Event) => {
      const customEvent = event as CustomEvent<{
        packageId: number;
        stepId: number;
        success: boolean;
      }>;

      if (customEvent.detail.success) {
        // Refetch enrollments to show updated status
        void fetchEnrollments();
      }
    };

    document.addEventListener("thrive-course:stepBooked", handleStepBooked);

    return () => {
      document.removeEventListener(
        "thrive-course:stepBooked",
        handleStepBooked,
      );
    };
  }, [fetchEnrollments]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const handleBookStep = (
    packageId: number,
    stepId: number,
    stepLabel: string,
    stepTitle: string,
  ) => {
    // Open the course step booking modal
    const event = new CustomEvent("thrive-course:bookStep", {
      detail: {
        packageId,
        stepId,
        stepLabel,
        stepTitle,
        isModifying: false,
      },
    });
    document.dispatchEvent(event);
  };

  const handleModifyStep = (
    packageId: number,
    stepId: number,
    stepLabel: string,
    stepTitle: string,
  ) => {
    // Open the course step booking modal in modify mode
    const event = new CustomEvent("thrive-course:bookStep", {
      detail: {
        packageId,
        stepId,
        stepLabel,
        stepTitle,
        isModifying: true,
      },
    });
    document.dispatchEvent(event);
  };

  if (loading) {
    return (
      <div className="student-course-enrollments loading">
        <p>Loading course enrollments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-course-enrollments error">
        <p>Error loading enrollments: {error}</p>
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="student-course-enrollments empty">
        <p>You are not enrolled in any courses.</p>
        <a href="/courses" className="button">
          Browse Courses
        </a>
      </div>
    );
  }

  return (
    <div className="student-course-enrollments">
      <div className="enrollments-list">
        {enrollments.map((enrollment) => {
          const progressPercent =
            enrollment.totalSteps > 0
              ? (enrollment.completedSteps / enrollment.totalSteps) * 100
              : 0;

          return (
            <div key={enrollment.packageId} className="course-card">
              <div className="course-card-header">
                <div className="course-card-title-group">
                  <h4 className="course-card-title">
                    {enrollment.courseTitle}
                  </h4>
                  <p className="course-card-package">
                    {enrollment.packageName}
                  </p>
                </div>
                <div className="course-card-meta">
                  <span className="course-card-date">
                    Purchased: {formatDate(enrollment.purchasedAt)}
                  </span>
                  {enrollment.expiresAt && (
                    <span className="course-card-date">
                      Expires: {formatDate(enrollment.expiresAt)}
                    </span>
                  )}
                </div>
              </div>

              {showProgress && (
                <div className="course-card-progress">
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="progress-text">
                    {enrollment.completedSteps} of {enrollment.totalSteps} steps
                    completed
                  </div>
                </div>
              )}

              <div className="course-card-body">
                <h5 className="course-steps-title">Course Steps</h5>
                <ul className="course-steps-list">
                  {enrollment.progress.map((step) => {
                    const action = stepActions.get(step.stepId);
                    // TODO: The Change Session button should not be available if there are no session options available.
                    const canModify = action?.canModify ?? false;

                    return (
                      <li key={step.stepId} className="course-step">
                        <div className="course-step-info">
                          <span className="course-step-label">
                            {step.stepLabel}
                          </span>
                          <span className="course-step-title">
                            {step.stepTitle}
                          </span>
                        </div>
                        <div className="course-step-status">
                          <span
                            className={`status-badge status-${step.status.toLowerCase()}`}
                          >
                            {step.status}
                          </span>
                          {action && action.action !== "none" && (
                            <button
                              className={`button step-action-btn step-action-${action.action}`}
                              disabled={
                                action.action === "modify" && !canModify
                              }
                              onClick={() => {
                                if (action.action === "book") {
                                  handleBookStep(
                                    enrollment.packageId,
                                    step.stepId,
                                    step.stepLabel,
                                    step.stepTitle,
                                  );
                                } else if (action.action === "modify") {
                                  handleModifyStep(
                                    enrollment.packageId,
                                    step.stepId,
                                    step.stepLabel,
                                    step.stepTitle,
                                  );
                                }
                              }}
                            >
                              {action.action === "book"
                                ? "Book Session"
                                : "Change Session"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="course-card-footer">
                <a
                  href={`/courses/${enrollment.courseProgramId}`}
                  className="button button-secondary"
                >
                  View Course Details
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
