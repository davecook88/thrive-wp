import React from "react";

interface CourseCardProps {
  course: {
    id: number;
    code: string;
    title: string;
    description: string | null;
    heroImageUrl: string | null;
    stepCount: number;
    priceInCents: number | null;
    levels: { id: number; code: string; name: string }[];
    availableCohorts: number;
    nextCohortStartDate: string | null;
  };
  showLevelBadges: boolean;
  showPrice: boolean;
  showEnrollmentCount: boolean;
  showCohortInfo: boolean;
  showDescription: boolean;
  cardLayout: "image-top" | "image-side";
  imagePlaceholder: string;
}

export default function CourseCard({
  course,
  showLevelBadges,
  showPrice,
  showCohortInfo,
  showDescription,
  cardLayout,
  imagePlaceholder,
}: CourseCardProps) {
  const formatPrice = (cents: number | null) => {
    if (cents === null) return "Price TBA";
    const dollars = cents / 100;
    return `$${dollars.toFixed(0)}`;
  };

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const imageUrl =
    course.heroImageUrl ||
    imagePlaceholder ||
    "/wp-content/themes/custom-theme/assets/images/course-placeholder.jpg";

  return (
    <a
      href={`/courses/${course.code}`}
      className={`course-card course-card--${cardLayout}`}
    >
      <div className="course-card__image">
        <img src={imageUrl} alt={course.title} loading="lazy" />
        {showLevelBadges && course.levels.length > 0 && (
          <div className="course-card__badges">
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
      </div>

      <div className="course-card__content">
        <h3 className="course-card__title">{course.title}</h3>

        {showDescription && course.description && (
          <p className="course-card__description">{course.description}</p>
        )}

        <div className="course-card__meta">
          <span className="course-card__steps">
            {course.stepCount} {course.stepCount === 1 ? "session" : "sessions"}
          </span>

          {showCohortInfo && course.nextCohortStartDate && (
            <span className="course-card__next-cohort">
              Starts {formatDate(course.nextCohortStartDate)}
            </span>
          )}

          {showCohortInfo && course.availableCohorts > 0 && (
            <span className="course-card__cohort-count">
              {course.availableCohorts}{" "}
              {course.availableCohorts === 1 ? "cohort" : "cohorts"} available
            </span>
          )}
        </div>

        {showPrice && (
          <div className="course-card__price">
            {formatPrice(course.priceInCents)}
          </div>
        )}

        <div className="course-card__cta">
          <span className="button">View Course</span>
        </div>
      </div>
    </a>
  );
}
