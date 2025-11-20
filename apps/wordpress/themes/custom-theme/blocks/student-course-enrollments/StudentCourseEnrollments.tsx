import React, { useEffect, useState } from "react";
import SessionBookingModal from "../../src/components/SessionBookingModal";

interface StudentCoursePackage {
  packageId: number;
  packageName: string;
  courseProgramId: number;
  courseCode: string;
  courseTitle: string;
  courseDescription: string | null;
  cohortId: number | null;
  cohortName: string | null;
  purchasedAt: string;
  expiresAt: string | null;
  progress: CourseStepProgress[];
  completedSteps: number;
  totalSteps: number;
  unbookedSteps: number;
  nextSessionAt: string | null;
}

interface CourseStepProgress {
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  stepOrder: number;
  status: "UNBOOKED" | "BOOKED" | "COMPLETED" | "MISSED" | "CANCELLED";
  bookedAt: string | null;
  completedAt: string | null;
  sessionId: number | null;
}

interface StudentCourseEnrollmentsProps {
  showProgress?: boolean;
  showNextSession?: boolean;
}

export default function StudentCourseEnrollments({
  showProgress = true,
  showNextSession = true,
}: StudentCourseEnrollmentsProps) {
  const [packages, setPackages] = useState<StudentCoursePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingPackageId, setBookingPackageId] = useState<number | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await fetch("/api/students/me/course-packages", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch course packages");
        }

        const data = await response.json();
        setPackages(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

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

  if (loading) {
    return (
      <div className="student-course-enrollments loading">
        <p>Loading your courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-course-enrollments error">
        <p>Error loading courses: {error}</p>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="student-course-enrollments empty">
        <h3>You're not enrolled in any courses yet</h3>
        <p>Browse our available courses and start learning today!</p>
        <a href="/courses" className="button button--primary">
          Browse Courses
        </a>
      </div>
    );
  }

  return (
    <div className="student-course-enrollments">
      <div className="enrollments-list">
        {packages.map((pkg) => {
          const progressPercent =
            pkg.totalSteps > 0
              ? (pkg.completedSteps / pkg.totalSteps) * 100
              : 0;

          return (
            <div key={pkg.packageId} className="course-package-card">
              <div className="course-package-card__header">
                <div>
                  <h3 className="course-package-card__title">
                    {pkg.courseTitle}
                  </h3>
                  {pkg.cohortName && (
                    <p className="course-package-card__cohort">
                      {pkg.cohortName}
                    </p>
                  )}
                </div>
                <a
                  href={`/courses/${pkg.courseCode}`}
                  className="course-package-card__view-link"
                >
                  View Course →
                </a>
              </div>

              {pkg.courseDescription && (
                <p className="course-package-card__description">
                  {pkg.courseDescription}
                </p>
              )}

              {showProgress && (
                <div className="course-package-card__progress">
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <div className="progress-stats">
                    <span className="progress-text">
                      {pkg.completedSteps} of {pkg.totalSteps} sessions
                      completed
                    </span>
                    {pkg.unbookedSteps > 0 && (
                      <span className="progress-unbooked">
                        {pkg.unbookedSteps} session
                        {pkg.unbookedSteps === 1 ? "" : "s"} not yet booked
                      </span>
                    )}
                  </div>
                </div>
              )}

              {showNextSession && pkg.nextSessionAt && (
                <div className="course-package-card__next-session">
                  <strong>Next session:</strong>{" "}
                  {formatDateTime(pkg.nextSessionAt)}
                </div>
              )}

              <div className="course-package-card__actions">
                <a
                  href={`/dashboard/courses/${pkg.packageId}`}
                  className="button button--secondary"
                >
                  View Details
                </a>

                {pkg.unbookedSteps > 0 && (
                  <button
                    onClick={() => setBookingPackageId(pkg.packageId)}
                    className="button button--primary"
                  >
                    Book Remaining Sessions
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {bookingPackageId && (
        <SessionBookingModal
          packageId={bookingPackageId}
          onClose={() => {
            setBookingPackageId(null);
            // Refresh packages after booking
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
