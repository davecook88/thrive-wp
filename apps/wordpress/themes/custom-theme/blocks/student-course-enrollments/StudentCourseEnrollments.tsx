import React, { useEffect, useState } from "react";

interface CourseEnrollment {
  enrollmentId: number;
  courseId: number;
  courseName: string;
  description: string;
  status: string;
  enrolledAt: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
  completedSessions: number;
  nextSessionAt: string | null;
}

interface StudentCourseEnrollmentsProps {
  showProgress?: boolean;
  showNextSession?: boolean;
}

export default function StudentCourseEnrollments({
  showProgress = true,
  showNextSession = true,
}: StudentCourseEnrollmentsProps) {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
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
      <h3>My Courses</h3>
      <div className="enrollments-list">
        {enrollments.map((enrollment) => {
          const progressPercent =
            enrollment.totalSessions > 0
              ? (enrollment.completedSessions / enrollment.totalSessions) * 100
              : 0;

          return (
            <div key={enrollment.enrollmentId} className="course-card">
              <div className="course-header">
                <h4 className="course-name">{enrollment.courseName}</h4>
                <span className="course-status">{enrollment.status}</span>
              </div>

              {enrollment.description && (
                <p className="course-description">{enrollment.description}</p>
              )}

              <div className="course-dates">
                <span className="course-date">
                  {formatDate(enrollment.startDate)} -{" "}
                  {formatDate(enrollment.endDate)}
                </span>
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
                    {enrollment.completedSessions} of {enrollment.totalSessions} sessions completed
                  </div>
                </div>
              )}

              {showNextSession && enrollment.nextSessionAt && (
                <div className="course-next-session">
                  <strong>Next session:</strong>{" "}
                  {formatDateTime(enrollment.nextSessionAt)}
                </div>
              )}

              <div className="course-actions">
                <a href={`/courses/${enrollment.courseId}`} className="button">
                  View Course
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
