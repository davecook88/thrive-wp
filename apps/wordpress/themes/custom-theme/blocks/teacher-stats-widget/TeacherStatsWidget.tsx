import React, { useEffect, useState } from "react";

interface NextSession {
  id: number;
  classType: string;
  startAt: string;
  endAt: string;
  studentId: number;
  studentName: string;
  courseId: number | null;
  meetingUrl: string | null;
}

interface TeacherStats {
  nextSession: NextSession | null;
  totalCompleted: number;
  totalScheduled: number;
  activeStudents: number;
}

interface TeacherStatsWidgetProps {
  showNextSession?: boolean;
  showCompletedSessions?: boolean;
  showScheduledSessions?: boolean;
  showActiveStudents?: boolean;
}

export default function TeacherStatsWidget({
  showNextSession = true,
  showCompletedSessions = true,
  showScheduledSessions = true,
  showActiveStudents = true,
}: TeacherStatsWidgetProps) {
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/teachers/me/stats", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch stats");
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
      <div className="teacher-stats-widget loading">
        <p>Loading your stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-stats-widget error">
        <p>Error loading stats: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="teacher-stats-widget">
      {showNextSession && stats.nextSession && (
        <div className="stat-card next-session">
          <h3 className="stat-label">Next Session</h3>
          <div className="stat-content">
            <div className="session-time">
              {formatDateTime(stats.nextSession.startAt)}
            </div>
            <div className="session-student">
              with {stats.nextSession.studentName}
            </div>
            <div className="session-type">{stats.nextSession.classType}</div>
          </div>
        </div>
      )}

      {showCompletedSessions && (
        <div className="stat-card completed-sessions">
          <h3 className="stat-label">Classes Taught</h3>
          <div className="stat-value">{stats.totalCompleted}</div>
        </div>
      )}

      {showScheduledSessions && (
        <div className="stat-card scheduled-sessions">
          <h3 className="stat-label">Upcoming Sessions</h3>
          <div className="stat-value">{stats.totalScheduled}</div>
        </div>
      )}

      {showActiveStudents && (
        <div className="stat-card active-students">
          <h3 className="stat-label">Active Students</h3>
          <div className="stat-value">{stats.activeStudents}</div>
        </div>
      )}
    </div>
  );
}
