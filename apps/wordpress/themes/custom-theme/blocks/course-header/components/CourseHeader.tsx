import React, { useEffect, useState } from "react";

interface CourseHeaderProps {
  showDescription: boolean;
  showLevelBadges: boolean;
  showPrice: boolean;
  showStepCount: boolean;
  courseCode: string; // Passed from parent context
}

interface CourseDetail {
  id: number;
  code: string;
  title: string;
  description: string | null;
  priceInCents: number | null;
  levels: { id: number; code: string; name: string }[];
  steps: any[];
}

export default function CourseHeader({
  showDescription,
  showLevelBadges,
  showPrice,
  showStepCount,
  courseCode,
}: CourseHeaderProps) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/course-programs/${courseCode}`);
        if (!response.ok) throw new Error("Course not found");
        const data = await response.json();
        setCourse(data);
      } catch (err) {
        console.error("Error fetching course:", err);
      } finally {
        setLoading(false);
      }
    };

    if (courseCode) {
      fetchCourse();
    }
  }, [courseCode]);

  // Check if student is enrolled in this course
  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        const response = await fetch("/api/packages/my-credits", {
          credentials: "include",
        });
        if (response.ok) {
          const packages = await response.json();
          // Check if any package has this course code in metadata
          const enrolled = packages.some(
            (pkg: any) =>
              pkg.metadata?.courseCode === courseCode &&
              pkg.expiresAt === null // Course packages don't expire
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
      checkEnrollment();
    }
  }, [courseCode]);

  if (loading) {
    return (
      <div className="course-header loading">Loading course details...</div>
    );
  }

  if (!course) {
    return <div className="course-header error">Course not found.</div>;
  }

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "Price TBA";
    return `$${(cents / 100).toFixed(0)}`;
  };

  return (
    <div className="course-header">
      <div className="course-header__badges-row">
        {showLevelBadges && course.levels.length > 0 && (
          <div className="course-header__badges">
            {course.levels.map((level) => (
              <span
                key={level.id}
                className={`level-badge level-badge--${level.code.toLowerCase()}`}
              >
                {level.name}
              </span>
            ))}
          </div>
        )}

        {!enrollmentLoading && isEnrolled && (
          <span className="enrollment-badge enrollment-badge--enrolled">
            ✓ Enrolled
          </span>
        )}
      </div>

      <h1 className="course-header__title">{course.title}</h1>

      {showDescription && course.description && (
        <p className="course-header__description">{course.description}</p>
      )}

      <div className="course-header__meta">
        {showStepCount && (
          <span className="course-header__steps">
            {course.steps.length}{" "}
            {course.steps.length === 1 ? "session" : "sessions"}
          </span>
        )}

        {showPrice && (
          <span className="course-header__price">
            {formatPrice(course.priceInCents)}
          </span>
        )}
      </div>
    </div>
  );
}
