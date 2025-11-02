import React, { useEffect, useState } from "react";
import { thriveClient } from "../../../../../shared/thrive";
import { PublicCourseCohortDto, ThriveApiError } from "@thrive/shared";

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

  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const data = await thriveClient.getCohortsByCourseCode(courseCode);
        setCohorts(data);
        setError(null);
      } catch (err: unknown) {
        console.error("Error fetching cohorts:", err);
        const errorMessage =
          err instanceof ThriveApiError
            ? err.message
            : "Failed to load cohorts";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (courseCode) {
      void fetchCohorts();
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
        const message =
          err instanceof ThriveApiError
            ? err.message
            : "Failed to start enrollment process";
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
            <button
              type="button"
              className="button"
              disabled={!cohort.isAvailable}
              onClick={() => handleEnroll(cohort.id)}
            >
              {!cohort.isAvailable ? "Unavailable" : ctaText}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
