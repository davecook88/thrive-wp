import React, { useEffect, useState } from "react";

interface CoursePackageDetail {
  packageId: number;
  packageName: string;
  courseProgramId: number;
  courseCode: string;
  courseTitle: string;
  courseDescription: string | null;
  courseHeroImageUrl: string | null;
  cohortId: number;
  cohortName: string;
  cohortStartDate: string;
  cohortEndDate: string;
  purchasedAt: string;
  progress: StepProgress[];
  completedSteps: number;
  totalSteps: number;
  unbookedSteps: number;
  sessions: CourseSession[];
  courseLevels: { id: number; code: string; name: string }[];
}

interface StepProgress {
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  stepOrder: number;
  status: "UNBOOKED" | "BOOKED" | "COMPLETED" | "MISSED" | "CANCELLED";
  bookedAt: string | null;
  completedAt: string | null;
  sessionId: number | null;
}

interface CourseSession {
  sessionId: number;
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  groupClassName: string;
  startUtc: string;
  endUtc: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  meetingUrl: string | null;
  teacherId: number;
  teacherName: string;
}

interface CoursePackageDetailProps {
  packageId: string; // From URL param
}

export default function CoursePackageDetail({
  packageId,
}: CoursePackageDetailProps) {
  const [coursePackage, setCoursePackage] =
    useState<CoursePackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackageDetail = async () => {
      try {
        const response = await fetch(
          `/api/students/me/course-packages/${packageId}`,
          { credentials: "include" }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch course package");
        }

        const data = await response.json();
        setCoursePackage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchPackageDetail();
  }, [packageId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "✓";
      case "BOOKED":
        return "📅";
      case "UNBOOKED":
        return "⏳";
      case "MISSED":
        return "⚠️";
      case "CANCELLED":
        return "✕";
      default:
        return "";
    }
  };

  const getStatusClass = (status: string) => {
    return `step-status step-status--${status.toLowerCase()}`;
  };

  if (loading) {
    return <div className="course-package-detail loading">Loading...</div>;
  }

  if (error || !coursePackage) {
    return (
      <div className="course-package-detail error">
        <p>Error loading course: {error}</p>
        <a href="/dashboard" className="button">
          Back to Dashboard
        </a>
      </div>
    );
  }

  const progressPercent =
    coursePackage.totalSteps > 0
      ? (coursePackage.completedSteps / coursePackage.totalSteps) * 100
      : 0;

  return (
    <div className="course-package-detail">
      {/* Header */}
      <div className="course-package-detail__header">
        <a href="/dashboard" className="back-link">
          ← Back to Dashboard
        </a>

        <div className="header-content">
          {coursePackage.courseHeroImageUrl && (
            <img
              src={coursePackage.courseHeroImageUrl}
              alt={coursePackage.courseTitle}
              className="header-image"
            />
          )}

          <div className="header-info">
            <h1>{coursePackage.courseTitle}</h1>
            <p className="cohort-name">{coursePackage.cohortName}</p>
            <p className="cohort-dates">
              {formatDate(coursePackage.cohortStartDate)} -{" "}
              {formatDate(coursePackage.cohortEndDate)}
            </p>

            {coursePackage.courseLevels.length > 0 && (
              <div className="level-badges">
                {coursePackage.courseLevels.map((level) => (
                  <span
                    key={level.id}
                    className={`level-badge level-badge--${level.code.toLowerCase()}`}
                  >
                    {level.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Overview */}
        <div className="progress-overview">
          <h3>Your Progress</h3>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="progress-stats">
            <span>
              {coursePackage.completedSteps} of {coursePackage.totalSteps}{" "}
              sessions completed
            </span>
            {coursePackage.unbookedSteps > 0 && (
              <span className="unbooked-warning">
                {coursePackage.unbookedSteps} session
                {coursePackage.unbookedSteps === 1 ? "" : "s"} to book
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Step Progress */}
      <div className="course-package-detail__steps">
        <h2>Course Steps</h2>
        <div className="steps-list">
          {coursePackage.progress
            .sort((a, b) => a.stepOrder - b.stepOrder)
            .map((step) => {
              const session = coursePackage.sessions.find(
                (s) => s.sessionId === step.sessionId
              );

              return (
                <div key={step.stepId} className="step-item">
                  <div className="step-item__status">
                    <span className={getStatusClass(step.status)}>
                      {getStatusIcon(step.status)}
                    </span>
                  </div>

                  <div className="step-item__content">
                    <h4 className="step-item__title">
                      {step.stepLabel}: {step.stepTitle}
                    </h4>

                    {step.status === "BOOKED" && session && (
                      <div className="step-item__session">
                        <p>
                          <strong>{session.groupClassName}</strong>
                        </p>
                        <p>
                          Scheduled: {formatDateTime(session.startUtc)}
                        </p>
                        {session.meetingUrl && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button button--small"
                          >
                            Join Meeting
                          </a>
                        )}
                      </div>
                    )}

                    {step.status === "COMPLETED" && step.completedAt && (
                      <p className="step-item__completed">
                        Completed on {formatDate(step.completedAt)}
                      </p>
                    )}

                    {step.status === "UNBOOKED" && (
                      <p className="step-item__unbooked">
                        Session not yet booked
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Actions */}
      {coursePackage.unbookedSteps > 0 && (
        <div className="course-package-detail__actions">
          <a
            href={`/dashboard/courses/${packageId}/book-sessions`}
            className="button button--primary button--large"
          >
            Book Remaining Sessions
          </a>
        </div>
      )}
    </div>
  );
}
