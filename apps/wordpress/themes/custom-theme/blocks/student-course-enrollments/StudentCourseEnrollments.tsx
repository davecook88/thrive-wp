import { useEffect, useState } from "react";
import type { StudentCoursePackage } from "@thrive/shared";

interface StudentCourseEnrollmentsProps {
  showProgress?: boolean;
}

export default function StudentCourseEnrollments({
  showProgress = true,
}: StudentCourseEnrollmentsProps) {
  const [enrollments, setEnrollments] = useState<StudentCoursePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const response = await fetch("/api/students/me/enrollments", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch enrollments");
        }

        const data = await response.json();
        setEnrollments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
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
              <div className="course-header">
                <h4 className="course-name">
                  {enrollment.courseCode}: {enrollment.courseTitle}
                </h4>
              </div>

              <div className="course-meta">
                <div className="package-name">📦 {enrollment.packageName}</div>
                <div className="purchased-date">
                  📅 Purchased: {formatDate(enrollment.purchasedAt)}
                </div>
                {enrollment.expiresAt && (
                  <div className="expires-date">
                    ⏰ Expires: {formatDate(enrollment.expiresAt)}
                  </div>
                )}
              </div>

              {showProgress && (
                <div className="course-progress">
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {enrollment.completedSteps} of {enrollment.totalSteps} steps
                    completed
                  </div>
                </div>
              )}

              <div className="course-steps">
                <h5>Course Steps</h5>
                <ul className="steps-list">
                  {enrollment.progress.map((step) => (
                    <li
                      key={step.stepId}
                      className={`step-item status-${step.status.toLowerCase()}`}
                    >
                      <span className="step-label">{step.stepLabel}</span>
                      <span className="step-title">{step.stepTitle}</span>
                      <span
                        className={`step-status ${step.status.toLowerCase()}`}
                      >
                        {step.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="course-actions">
                <a
                  href={`/courses/${enrollment.courseProgramId}`}
                  className="button"
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
