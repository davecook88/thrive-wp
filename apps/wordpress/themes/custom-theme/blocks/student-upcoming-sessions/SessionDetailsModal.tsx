import React, { useEffect, useState } from "react";
import { UpcomingSessionDto } from "@thrive/shared";

interface SessionDetailsModalProps {
  session: UpcomingSessionDto;
  onClose: () => void;
}

interface SessionDetails {
  id: number;
  classType: string;
  startAt: string;
  endAt: string;
  teacherId: number;
  teacherName: string;
  teacherBio?: string;
  teacherAvatarUrl?: string;
  courseId?: number | null;
  courseName?: string | null;
  courseSlug?: string | null;
  stepId?: number | null;
  stepTitle?: string | null;
  meetingUrl?: string | null;
  status: string;
  groupClass?: {
    id: number;
    title: string;
    description?: string;
    level?: {
      code: string;
      name: string;
    };
  };
  enrolledStudents?: Array<{
    id: number;
    name: string;
    avatarUrl?: string;
  }>;
  materials?: Array<{
    id: number;
    title: string;
    type: string;
  }>;
}

export default function SessionDetailsModal({
  session,
  onClose,
}: SessionDetailsModalProps) {
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // For now, use the basic session data
        // TODO: Create a dedicated endpoint to fetch full session details
        setDetails({
          ...session,
          groupClass: undefined,
          enrolledStudents: [],
          materials: [],
        });
      } catch (err) {
        console.error("Failed to fetch session details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [session]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const getDuration = () => {
    if (!details) return "";
    const start = new Date(details.startAt);
    const end = new Date(details.endAt);
    const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    return `${minutes} minutes`;
  };

  const isSessionSoon = () => {
    if (!details) return false;
    const now = new Date();
    const sessionStart = new Date(details.startAt);
    const hoursUntilSession =
      (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilSession <= 1 && hoursUntilSession > 0;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (loading || !details) {
    return (
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="session-details-modal">
          <div className="modal-loading">Loading session details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="session-details-modal">
        <div className="modal-header">
          <div>
            <h2>{details.courseName || details.classType}</h2>
            {details.groupClass && (
              <p className="group-class-title">{details.groupClass.title}</p>
            )}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Session Time */}
          <section className="session-section">
            <h3>
              <span className="section-icon">📅</span>
              Session Details
            </h3>
            <div className="session-time-info">
              <div className="info-row">
                <span className="info-label">Date & Time:</span>
                <span className="info-value">
                  {formatDateTime(details.startAt)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Duration:</span>
                <span className="info-value">{getDuration()}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status:</span>
                <span className={`status-badge status-${details.status.toLowerCase()}`}>
                  {details.status}
                </span>
              </div>
            </div>
          </section>

          {/* Teacher Info */}
          <section className="session-section">
            <h3>
              <span className="section-icon">👨‍🏫</span>
              Your Teacher
            </h3>
            <div className="teacher-card">
              {details.teacherAvatarUrl && (
                <img
                  src={details.teacherAvatarUrl}
                  alt={details.teacherName}
                  className="teacher-avatar"
                />
              )}
              <div className="teacher-info">
                <h4>{details.teacherName}</h4>
                {details.teacherBio && <p>{details.teacherBio}</p>}
              </div>
            </div>
          </section>

          {/* Course Info */}
          {details.courseName && (
            <section className="session-section">
              <h3>
                <span className="section-icon">📚</span>
                Course Information
              </h3>
              <div className="course-info">
                <div className="info-row">
                  <span className="info-label">Course:</span>
                  <span className="info-value">{details.courseName}</span>
                </div>
                {details.stepTitle && (
                  <div className="info-row">
                    <span className="info-label">Step:</span>
                    <span className="info-value">{details.stepTitle}</span>
                  </div>
                )}
                {details.courseSlug && details.stepId && (
                  <a
                    href={`/course/${details.courseSlug}/step-${details.stepId}`}
                    className="view-materials-link"
                  >
                    View Course Materials →
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Group Class Description */}
          {details.groupClass?.description && (
            <section className="session-section">
              <h3>
                <span className="section-icon">ℹ️</span>
                About This Class
              </h3>
              <p className="class-description">{details.groupClass.description}</p>
              {details.groupClass.level && (
                <div className="level-badge">
                  Level: {details.groupClass.level.name}
                </div>
              )}
            </section>
          )}

          {/* Classmates */}
          {details.enrolledStudents && details.enrolledStudents.length > 0 && (
            <section className="session-section">
              <h3>
                <span className="section-icon">👥</span>
                Your Classmates ({details.enrolledStudents.length})
              </h3>
              <div className="classmates-list">
                {details.enrolledStudents.map((student) => (
                  <div key={student.id} className="classmate-item">
                    {student.avatarUrl && (
                      <img
                        src={student.avatarUrl}
                        alt={student.name}
                        className="classmate-avatar"
                      />
                    )}
                    <span>{student.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Materials */}
          {details.materials && details.materials.length > 0 && (
            <section className="session-section">
              <h3>
                <span className="section-icon">📄</span>
                Session Materials
              </h3>
              <ul className="materials-list">
                {details.materials.map((material) => (
                  <li key={material.id} className="material-item">
                    <span className="material-type">{material.type}</span>
                    <span className="material-title">{material.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="modal-footer">
          {details.meetingUrl && (
            <a
              href={details.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button button--primary button--large"
            >
              {isSessionSoon() ? "🎥 Join Now" : "📋 View Meeting Link"}
            </a>
          )}
          <button className="button button--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
