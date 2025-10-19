import { useEffect, useState } from "react";
import { thriveClient } from "../../../../shared/thrive";
import { UpcomingSessionDto } from "@thrive/shared";

interface StudentUpcomingSessionsProps {
  limit?: number;
  showMeetingLinks?: boolean;
}

export default function StudentUpcomingSessions({
  limit = 5,
  showMeetingLinks = true,
}: StudentUpcomingSessionsProps) {
  const [sessions, setSessions] = useState<UpcomingSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await thriveClient.fetchStudentUpcomingSessions(limit);
        setSessions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [limit]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
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

  const isSessionSoon = (startAt: string) => {
    const now = new Date();
    const sessionStart = new Date(startAt);
    const hoursUntilSession =
      (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilSession <= 1 && hoursUntilSession > 0;
  };

  if (loading) {
    return (
      <div className="student-upcoming-sessions loading">
        <p>Loading upcoming sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-upcoming-sessions error">
        <p>Error loading sessions: {error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="student-upcoming-sessions empty">
        <p>No upcoming sessions scheduled.</p>
        <a href="/booking" className="button">
          Book a Session
        </a>
      </div>
    );
  }

  return (
    <div className="student-upcoming-sessions">
      <h3>Upcoming Sessions</h3>
      <div className="sessions-list">
        {sessions.map((session) => {
          const isSoon = isSessionSoon(session.startAt);

          return (
            <div
              key={session.id}
              className={`session-card ${isSoon ? "session-soon" : ""}`}
            >
              <div className="session-time">
                <div className="session-date">
                  {formatDateTime(session.startAt)}
                </div>
                <div className="session-duration">
                  {formatTime(session.startAt)} - {formatTime(session.endAt)}
                </div>
              </div>

              <div className="session-info">
                <div className="session-type">{session.classType}</div>
                {session.courseName && (
                  <div className="session-course">{session.courseName}</div>
                )}
                <div className="session-teacher">
                  with {session.teacherName}
                </div>
              </div>

              {showMeetingLinks && session.meetingUrl && (
                <div className="session-actions">
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button join-button"
                  >
                    {isSoon ? "Join Now" : "Meeting Link"}
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="view-all-link">
        <a href="/student/sessions">View All Sessions</a>
      </div>
    </div>
  );
}
