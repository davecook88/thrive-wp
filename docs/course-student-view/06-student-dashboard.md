# Student Dashboard - Course Management

## Overview

This document details updates to the student dashboard to display enrolled courses, show course progress, and enable booking of remaining sessions.

---

## Components to Update

1. **StudentCourseEnrollments** - Main course list component
2. **CoursePackageDetail** - New detailed view for a single course
3. **SessionBookingModal** - Reuse session wizard for dashboard booking

---

## Component 1: StudentCourseEnrollments (Updated)

### Current State

**File:** `/apps/wordpress/themes/custom-theme/blocks/student-course-enrollments/StudentCourseEnrollments.tsx`

Currently shows placeholder course enrollments. Needs update to:
- Fetch real course packages from API
- Show cohort information
- Link to course detail page by code (not ID)
- Display progress and booking status
- Show "Book Remaining Sessions" button

### Updated Component

```tsx
import React, { useEffect, useState } from "react";

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
      <h2 className="enrollments-heading">My Courses</h2>

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
```

### Styling Updates (style.scss)

```scss
.student-course-enrollments {
  padding: 2rem 0;

  &.empty {
    text-align: center;
    padding: 4rem 2rem;

    h3 {
      font-size: 1.75rem;
      margin-bottom: 1rem;
    }

    p {
      color: var(--wp--preset--color--gray-600);
      margin-bottom: 2rem;
    }
  }
}

.enrollments-heading {
  font-size: 2rem;
  margin-bottom: 2rem;
}

.enrollments-list {
  display: grid;
  gap: 2rem;
}

.course-package-card {
  border: 1px solid var(--wp--preset--color--gray-200);
  border-radius: 0.75rem;
  padding: 2rem;
  background: white;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }

  &__cohort {
    color: var(--wp--preset--color--gray-600);
    font-size: 0.875rem;
    margin: 0;
  }

  &__view-link {
    color: var(--wp--preset--color--primary);
    text-decoration: none;
    font-weight: 600;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
    }
  }

  &__description {
    color: var(--wp--preset--color--gray-600);
    margin-bottom: 1.5rem;
  }

  &__progress {
    margin-bottom: 1.5rem;
  }

  &__next-session {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--wp--preset--color--blue-50);
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  &__actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--wp--preset--color--gray-200);
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-bar {
  height: 100%;
  background: var(--wp--preset--color--primary);
  transition: width 0.3s ease;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.progress-text {
  color: var(--wp--preset--color--gray-700);
}

.progress-unbooked {
  color: var(--wp--preset--color--orange-600);
  font-weight: 600;
}
```

---

## Component 2: CoursePackageDetail (New)

### Purpose

Detailed view of a single course package showing:
- Complete step-by-step progress
- All booked sessions
- Unbooked steps with booking option
- Course info and cohort details

### Component

**File:** `/apps/wordpress/themes/custom-theme/src/components/CoursePackageDetail.tsx`

```tsx
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
```

### WordPress Page Template

**File:** `/apps/wordpress/themes/custom-theme/page-course-package-detail.php`

```php
<?php
/**
 * Template for course package detail view
 * URL: /dashboard/courses/{packageId}
 */

// Ensure user is logged in
if (!thrive_is_logged_in()) {
    wp_redirect('/login');
    exit;
}

get_header();

$package_id = get_query_var('package_id');
?>

<main id="main" class="site-main">
    <div class="container">
        <div id="course-package-detail-mount" data-package-id="<?php echo esc_attr($package_id); ?>"></div>
    </div>
</main>

<?php
get_footer();
```

---

## Component 3: SessionBookingModal (Reuse Wizard)

**Purpose:** Modal version of session wizard for dashboard use.

**File:** `/apps/wordpress/themes/custom-theme/src/components/SessionBookingModal.tsx`

```tsx
import React, { useEffect, useState } from "react";
import SessionSelectionWizard from "./SessionSelectionWizard";

interface SessionBookingModalProps {
  packageId: number;
  onClose: () => void;
}

export default function SessionBookingModal({
  packageId,
  onClose,
}: SessionBookingModalProps) {
  useEffect(() => {
    // Prevent body scroll when modal open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <SessionSelectionWizard
          packageId={packageId}
          onComplete={onClose}
        />
      </div>
    </div>
  );
}
```

### Modal Styles

```scss
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--wp--preset--color--gray-600);
  line-height: 1;
  padding: 0;
  width: 2rem;
  height: 2rem;

  &:hover {
    color: var(--wp--preset--color--gray-900);
  }
}
```

---

## API Updates Required

### Update GET /students/me/course-packages Response

Add new fields to response (see [02-api-endpoints.md](./02-api-endpoints.md#get-studentsme-course-packages)):

- `courseCode` (string)
- `cohortId` (number | null)
- `cohortName` (string | null)
- `unbookedSteps` (number)

### Implement GET /students/me/course-packages/:packageId

Full detail view including sessions (see [02-api-endpoints.md](./02-api-endpoints.md#get-studentsme-course-packagespackageid)).

---

## WordPress Routing

### Add Rewrite Rules

**File:** `/apps/wordpress/plugins/thrive-admin/includes/rewrite-rules.php`

```php
<?php
/**
 * Custom rewrite rules for course package detail
 */

function thrive_course_package_rewrite_rules() {
    add_rewrite_rule(
        '^dashboard/courses/([0-9]+)/?$',
        'index.php?pagename=course-package-detail&package_id=$matches[1]',
        'top'
    );
}
add_action('init', 'thrive_course_package_rewrite_rules');

function thrive_course_package_query_vars($vars) {
    $vars[] = 'package_id';
    return $vars;
}
add_filter('query_vars', 'thrive_course_package_query_vars');
```

---

## Implementation Checklist

### Backend API
- [ ] Add `courseCode`, `cohortId`, `cohortName`, `unbookedSteps` to course packages response
- [ ] Implement detailed package endpoint with sessions
- [ ] Test API responses with real data

### Frontend Components
- [ ] Update StudentCourseEnrollments component
- [ ] Create CoursePackageDetail component
- [ ] Create SessionBookingModal wrapper
- [ ] Add all styling (SCSS)

### WordPress Integration
- [ ] Update block registration for StudentCourseEnrollments
- [ ] Create page template for course package detail
- [ ] Add rewrite rules for `/dashboard/courses/{id}`
- [ ] Test routing

### Testing
- [ ] Dashboard displays enrolled courses correctly
- [ ] Links to course detail page work
- [ ] Course package detail view loads correctly
- [ ] Progress tracking accurate
- [ ] "Book Remaining Sessions" button opens modal
- [ ] Session booking from dashboard works
- [ ] Mobile responsive

---

## Usage Flow

1. **Student logs in** → visits `/dashboard`
2. **StudentCourseEnrollments** block displays enrolled courses
3. **Student clicks "View Details"** → `/dashboard/courses/123`
4. **CoursePackageDetail** component loads
5. **Shows progress and booked sessions**
6. **Student clicks "Book Remaining Sessions"**
7. **SessionBookingModal** opens with wizard
8. **Student selects sessions** → submits
9. **Modal closes** → page refreshes with updated status

---

## Next Steps

After implementing dashboard updates:
1. Implement calendar integration (see [07-calendar-integration.md](./07-calendar-integration.md))
2. Test complete user journey from enrollment to dashboard
3. Add notifications for upcoming sessions (out of scope for MVP)
