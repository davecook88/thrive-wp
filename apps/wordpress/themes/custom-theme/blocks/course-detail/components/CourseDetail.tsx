import React, { useEffect, useState, useRef } from "react";
import { thriveClient } from "../../../../../shared/thrive";
import {
  PublicCourseCohortDto,
  CourseProgramDetailDto,
  ServiceType,
} from "@thrive/shared";
import type { ClassEvent } from "@thrive/shared/types/events";

interface CourseDetailProps {
  showDescription: boolean;
  showLevelBadges: boolean;
  showPrice: boolean;
  showStepCount: boolean;
  defaultView: "week" | "month";
  calendarHeight: number;
  courseCode: string;
}

interface ThriveCalendarElement extends HTMLElement {
  events: ClassEvent[];
}

export default function CourseDetail({
  showDescription,
  showLevelBadges,
  showPrice,
  showStepCount,
  defaultView,
  calendarHeight,
  courseCode,
}: CourseDetailProps) {
  // Course data
  const [course, setCourse] = useState<CourseProgramDetailDto | null>(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);

  // Cohorts data
  const [cohorts, setCohorts] = useState<PublicCourseCohortDto[]>([]);
  const [cohortsLoading, setCohortsLoading] = useState(true);
  const [cohortsError, setCohortsError] = useState<string | null>(null);

  // Selected cohort and its sessions
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<ClassEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Enrollment state
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const calendarRef = useRef<ThriveCalendarElement | null>(null);

  // Fetch course details
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/course-programs/${courseCode}`);
        if (!response.ok) throw new Error("Course not found");
        const data: CourseProgramDetailDto = await response.json();
        setCourse(data);
        setCourseError(null);
      } catch (err) {
        console.error("Error fetching course:", err);
        setCourseError(
          err instanceof Error ? err.message : "Failed to load course",
        );
      } finally {
        setCourseLoading(false);
      }
    };

    if (courseCode) {
      void fetchCourse();
    }
  }, [courseCode]);

  // Fetch cohorts
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const data = await thriveClient.getCohortsByCourseCode(courseCode);
        setCohorts(data);
        setCohortsError(null);

        // Auto-select first available cohort
        if (data.length > 0 && selectedCohortId === null) {
          const firstAvailable = data.find((c) => c.isAvailable);
          if (firstAvailable) {
            setSelectedCohortId(firstAvailable.id);
          } else if (data[0]) {
            setSelectedCohortId(data[0].id);
          }
        }
      } catch (err: unknown) {
        console.error("Error fetching cohorts:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load schedules";
        setCohortsError(errorMessage);
      } finally {
        setCohortsLoading(false);
      }
    };

    if (courseCode) {
      void fetchCohorts();
    }
  }, [courseCode, selectedCohortId]);

  // Check if student is enrolled
  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        const response = await fetch("/api/packages/my-credits", {
          credentials: "include",
        });
        if (response.ok) {
          const packages = await response.json();
          const enrolled = packages.some(
            (pkg: { metadata?: { courseCode?: string }; expiresAt: string | null }) =>
              pkg.metadata?.courseCode === courseCode &&
              pkg.expiresAt === null,
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

  // Fetch calendar events for selected cohort
  useEffect(() => {
    const fetchCohortSessions = async () => {
      if (!selectedCohortId) {
        setCalendarEvents([]);
        return;
      }

      const selectedCohort = cohorts.find((c) => c.id === selectedCohortId);

      if (!selectedCohort) {
        setCalendarEvents([]);
        return;
      }

      if (!selectedCohort.sessions || selectedCohort.sessions.length === 0) {
        setCalendarEvents([]);
        return;
      }

      setCalendarLoading(true);

      try {
        // Convert cohort sessions to calendar events and sort by date
        const events: ClassEvent[] = selectedCohort.sessions
          .map((session) => {
            const startTime = new Date(session.sessionDateTime);
            const endTime = new Date(
              startTime.getTime() + session.durationMinutes * 60000,
            );

            return {
              id: `session-${session.id}`,
              type: "class" as const,
              title: session.stepLabel,
              description: session.stepTitle,
              startUtc: startTime.toISOString(),
              endUtc: endTime.toISOString(),
              serviceType: ServiceType.COURSE,
              status: "SCHEDULED" as const,
              capacityMax: 0,
              sessionId: session.id.toString(),
            };
          })
          .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());

        setCalendarEvents(events);
      } catch (err) {
        console.error("Error processing cohort sessions:", err);
        setCalendarEvents([]);
      } finally {
        setCalendarLoading(false);
      }
    };

    void fetchCohortSessions();
  }, [selectedCohortId, cohorts]);

  // Update calendar web component when events change
  useEffect(() => {
    if (calendarEvents.length === 0) return;

    // Wait for calendar element to be available
    const setEventsOnCalendar = () => {
      if (calendarRef.current) {
        console.log('Setting events on calendar:', calendarEvents);
        calendarRef.current.events = calendarEvents;
        console.log('Events set, calendar.events:', calendarRef.current.events);
      } else {
        // Calendar not ready yet, try again
        console.log('Calendar ref not ready, retrying...');
        setTimeout(setEventsOnCalendar, 50);
      }
    };

    // Use setTimeout to allow React to render the calendar element first
    setTimeout(setEventsOnCalendar, 0);
  }, [calendarEvents]);

  // Handle enrollment
  const handleEnroll = async () => {
    if (!selectedCohortId) {
      alert("Please select a schedule first");
      return;
    }

    setEnrolling(true);
    try {
      const { url } = await thriveClient.enrollInCohort(
        courseCode,
        selectedCohortId,
      );
      window.location.href = url; // Redirect to Stripe checkout
    } catch (err: unknown) {
      console.error("Enrollment error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to start enrollment process";
      alert(message);
      setEnrolling(false);
    }
  };

  // Utility functions
  const formatPrice = (cents: number | null) => {
    if (cents === null) return "Price TBA";
    return `$${(cents / 100).toFixed(0)}`;
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // Loading state
  if (courseLoading || cohortsLoading) {
    return (
      <div className="course-detail course-detail--loading">
        <p>Loading course details...</p>
      </div>
    );
  }

  // Error state
  if (courseError || !course) {
    return (
      <div className="course-detail course-detail--error">
        <p>{courseError || "Course not found"}</p>
      </div>
    );
  }

  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId);

  return (
    <div className="course-detail">
      {/* Course Hero Section */}
      <div className="course-detail__hero">
        <div className="course-detail__badges-row">
          {showLevelBadges && course.levels && course.levels.length > 0 && (
            <div className="course-detail__badges">
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

        <h1 className="course-detail__title">{course.title}</h1>

        {showDescription && course.description && (
          <p className="course-detail__description">{course.description}</p>
        )}

        <div className="course-detail__meta">
          {showStepCount && course.steps && (
            <span className="course-detail__steps">
              {course.steps.length}{" "}
              {course.steps.length === 1 ? "session" : "sessions"}
            </span>
          )}

          {showPrice && (
            <span className="course-detail__price">
              {formatPrice(course.priceInCents)}
            </span>
          )}
        </div>
      </div>

      {/* Course Curriculum Section */}
      {course.steps && course.steps.length > 0 && (
        <div className="course-detail__curriculum">
          <h2 className="course-detail__section-title">What You'll Learn</h2>
          <div className="course-detail__steps-grid">
            {course.steps.map((step, index) => (
              <div key={step.id} className="course-detail__step-card">
                <div className="course-detail__step-number">{index + 1}</div>
                <div className="course-detail__step-content">
                  <h3 className="course-detail__step-title">{step.title || `Step ${index + 1}`}</h3>
                  {step.description && (
                    <p className="course-detail__step-description">{step.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Selector Section */}
      <div className="course-detail__schedules">
        <h2 className="course-detail__section-title">Select a Schedule</h2>

        {cohortsError ? (
          <div className="course-detail__error">{cohortsError}</div>
        ) : cohorts.length === 0 ? (
          <div className="course-detail__empty">
            <p>No schedules available at this time.</p>
          </div>
        ) : (
          <div className="course-detail__schedule-grid">
            {cohorts.map((cohort) => (
              <div
                key={cohort.id}
                className={`course-detail__schedule-card ${
                  selectedCohortId === cohort.id
                    ? "course-detail__schedule-card--selected"
                    : ""
                } ${
                  !cohort.isAvailable
                    ? "course-detail__schedule-card--unavailable"
                    : ""
                }`}
                onClick={() =>
                  cohort.isAvailable && setSelectedCohortId(cohort.id)
                }
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (
                    cohort.isAvailable &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    setSelectedCohortId(cohort.id);
                  }
                }}
              >
                <div className="course-detail__schedule-header">
                  <h3 className="course-detail__schedule-name">
                    {cohort.name}
                  </h3>
                  {selectedCohortId === cohort.id && (
                    <span className="course-detail__schedule-check">✓</span>
                  )}
                </div>

                <div className="course-detail__schedule-dates">
                  {cohort.startDate && cohort.endDate && (
                    <>{formatDate(cohort.startDate)} — {formatDate(cohort.endDate)}</>
                  )}
                </div>

                {cohort.description && (
                  <p className="course-detail__schedule-description">
                    {cohort.description}
                  </p>
                )}

                <div className="course-detail__schedule-meta">
                  {cohort.availableSpots > 0 ? (
                    <span className="course-detail__schedule-spots">
                      {cohort.availableSpots} spots remaining
                    </span>
                  ) : (
                    <span className="course-detail__schedule-spots course-detail__schedule-spots--full">
                      Full
                    </span>
                  )}

                  {!cohort.isAvailable && (
                    <span className="course-detail__schedule-unavailable">
                      Unavailable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar Section */}
      {selectedCohort && (
        <div className="course-detail__calendar">
          <h2 className="course-detail__section-title">
            Schedule for {selectedCohort.name}
          </h2>

          {calendarLoading ? (
            <div className="course-detail__calendar-loading">
              <p>Loading calendar...</p>
            </div>
          ) : calendarEvents.length === 0 ? (
            <div className="course-detail__calendar-empty">
              <p>No sessions scheduled yet.</p>
            </div>
          ) : (
            <thrive-calendar
              ref={calendarRef}
              view={defaultView}
              view-height={calendarHeight}
              show-classes
              show-bookings={false}
              readonly
            />
          )}
        </div>
      )}

      {/* Social Proof Section */}
      <div className="course-detail__social-proof">
        <h2 className="course-detail__section-title">Trusted by Students</h2>
        <div className="course-detail__stats-grid">
          <div className="course-detail__stat-card">
            <div className="course-detail__stat-number">500+</div>
            <div className="course-detail__stat-label">Students Enrolled</div>
          </div>
          <div className="course-detail__stat-card">
            <div className="course-detail__stat-number">4.9★</div>
            <div className="course-detail__stat-label">Average Rating</div>
          </div>
          <div className="course-detail__stat-card">
            <div className="course-detail__stat-number">95%</div>
            <div className="course-detail__stat-label">Completion Rate</div>
          </div>
          <div className="course-detail__stat-card">
            <div className="course-detail__stat-number">10+</div>
            <div className="course-detail__stat-label">Years Experience</div>
          </div>
        </div>

        <div className="course-detail__testimonials">
          <h3 className="course-detail__testimonials-title">What Students Say</h3>
          <div className="course-detail__testimonials-grid">
            <div className="course-detail__testimonial-card">
              <div className="course-detail__testimonial-stars">★★★★★</div>
              <p className="course-detail__testimonial-text">
                "This course completely transformed my confidence speaking Spanish. The instructors are patient and encouraging!"
              </p>
              <p className="course-detail__testimonial-author">— Maria G., Barcelona</p>
            </div>
            <div className="course-detail__testimonial-card">
              <div className="course-detail__testimonial-stars">★★★★★</div>
              <p className="course-detail__testimonial-text">
                "Great structure and pace. I loved the mix of grammar, conversation, and cultural content."
              </p>
              <p className="course-detail__testimonial-author">— James L., London</p>
            </div>
            <div className="course-detail__testimonial-card">
              <div className="course-detail__testimonial-stars">★★★★★</div>
              <p className="course-detail__testimonial-text">
                "The best investment I've made for my language learning. Highly recommended!"
              </p>
              <p className="course-detail__testimonial-author">— Sofia M., Madrid</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="course-detail__faq">
        <h2 className="course-detail__section-title">Frequently Asked Questions</h2>
        <div className="course-detail__faq-items">
          <details className="course-detail__faq-item">
            <summary className="course-detail__faq-question">
              What level of Spanish should I have before starting?
            </summary>
            <p className="course-detail__faq-answer">
              {course.levels && course.levels.length > 0
                ? `This course is designed for ${course.levels.map(l => l.name).join(", ")} level students.`
                : "Please check the course level requirements above."}
            </p>
          </details>

          <details className="course-detail__faq-item">
            <summary className="course-detail__faq-question">
              Can I access course materials after the course ends?
            </summary>
            <p className="course-detail__faq-answer">
              Yes! You'll have lifetime access to all course materials and resources.
            </p>
          </details>

          <details className="course-detail__faq-item">
            <summary className="course-detail__faq-question">
              How much time do I need to commit to each week?
            </summary>
            <p className="course-detail__faq-answer">
              Time commitment varies by course. On average, plan for 3-5 hours per week for active participation in sessions and practice.
            </p>
          </details>

          <details className="course-detail__faq-item">
            <summary className="course-detail__faq-question">
              Is there a money-back guarantee?
            </summary>
            <p className="course-detail__faq-answer">
              Yes! If you're not satisfied within the first 7 days, we offer a full refund. No questions asked.
            </p>
          </details>

          <details className="course-detail__faq-item">
            <summary className="course-detail__faq-question">
              What happens if I miss a live session?
            </summary>
            <p className="course-detail__faq-answer">
              All sessions are recorded and available for replay. You can watch them anytime that's convenient for you.
            </p>
          </details>
        </div>
      </div>

      {/* Enrollment CTA */}
      {!enrollmentLoading && (
        <div className="course-detail__cta">
          {isEnrolled ? (
            <div className="course-detail__enrolled">
              <p className="course-detail__enrolled-message">
                You are already enrolled in this course!
              </p>
              <a href="/student" className="button button--secondary">
                Go to My Dashboard
              </a>
            </div>
          ) : (
            <>
              {selectedCohort && (
                <button
                  type="button"
                  className="button button--primary button--large"
                  onClick={handleEnroll}
                  disabled={!selectedCohort.isAvailable || enrolling}
                >
                  {enrolling
                    ? "Processing..."
                    : `Enroll in ${selectedCohort.name}`}
                </button>
              )}
              {!selectedCohort && cohorts.length > 0 && (
                <p className="course-detail__cta-hint">
                  Select a schedule above to enroll
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
