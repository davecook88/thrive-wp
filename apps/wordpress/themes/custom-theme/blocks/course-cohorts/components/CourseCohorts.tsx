import React, { useEffect, useState } from "react";
import { thriveClient } from "../../../../../shared/thrive";
import { PublicCourseCohortDto } from "@thrive/shared";

interface CourseCohortsProps {
  courseCode: string;
  showDescription: boolean;
  showEnrollmentCount: boolean;
  ctaText: string;
}

export default function CourseCohorts({
  courseCode,
  showDescription,
  showEnrollmentCount,
  ctaText,
}: CourseCohortsProps) {
  const [cohorts, setCohorts] = useState<PublicCourseCohortDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);

  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const data = await thriveClient.getCohortsByCourseCode(courseCode);
        setCohorts(data);
        setError(null);
      } catch (err: unknown) {
        console.error("Error fetching cohorts:", err);

        setError("Failed to load cohorts");
      } finally {
        setLoading(false);
      }
    };

    if (courseCode) {
      void fetchCohorts();
    }
  }, [courseCode]);

  // Check if student is enrolled in this course
  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        const response = await thriveClient.fetchStudentCredits();
        if (response) {
          // Check if any package has an allowance for this course
          const enrolled = response.packages.some(
            (pkg) =>
              pkg.expiresAt === null && // Course packages don't expire
              pkg.allowances.some((allowance) => {
                // Parse courseCode to get the course program ID
                const courseProgramId = parseInt(courseCode, 10);
                return (
                  allowance.courseProgramId === courseProgramId &&
                  allowance.remainingCredits !== undefined &&
                  allowance.remainingCredits > 0
                );
              }),
          );
          setIsEnrolled(enrolled);
        }
      } catch (err) {
        console.error("Error checking enrollment:", err);
      } finally {
        setEnrollmentLoading(false);
      }
    };

    if (courseCode) {
      void checkEnrollment();
    }
  }, [courseCode]);

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const handleEnroll = (cohortId: number) => {
    void (async () => {
      try {
        const { url } = await thriveClient.enrollInCohort(courseCode, cohortId);
        window.location.href = url; // Redirect to Stripe checkout
      } catch (err: unknown) {
        console.error("Enrollment error:", err);
        const message = "Failed to start enrollment process";
        alert(message);
      }
    })();
  };

  if (loading) {
    return <div className="course-cohorts loading">Loading cohorts...</div>;
  }

  if (error) {
    return <div className="course-cohorts error">{error}</div>;
  }

  if (cohorts.length === 0) {
    return <div className="course-cohorts empty">No cohorts available.</div>;
  }

  return (
    <div className="course-cohorts">
      {cohorts.map((cohort) => (
        <div key={cohort.id} className="course-cohort">
          <div className="course-cohort__meta">
            <h3 className="course-cohort__name">{cohort.name}</h3>
            <div className="course-cohort__dates">
              {formatDate(cohort.startDate)} — {formatDate(cohort.endDate)}
            </div>
            {showEnrollmentCount && (
              <div className="course-cohort__enrollment">
                {cohort.availableSpots} spots remaining
              </div>
            )}
          </div>

          {showDescription && cohort.description && (
            <div className="course-cohort__description">
              {cohort.description}
            </div>
          )}

          <div className="course-cohort__actions">
            {!enrollmentLoading && isEnrolled ? (
              <div className="enrollment-status">
                <span className="enrollment-status__badge">
                  ✓ Already Enrolled
                </span>
                <a href="/student" className="button button--secondary">
                  Go to Dashboard
                </a>
              </div>
            ) : (
              <button
                type="button"
                className="button"
                disabled={!cohort.isAvailable}
                onClick={() => handleEnroll(cohort.id)}
              >
                {!cohort.isAvailable ? "Unavailable" : ctaText}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
