import React, { useEffect, useState } from "react";
import {
  thriveClient,
  StudentStatsResponseDto,
  ThriveApiError,
} from "@thrive/shared";

interface StudentStatsWidgetProps {
  showNextSession?: boolean;
  showCompletedSessions?: boolean;
  showScheduledSessions?: boolean;
  showActiveCourses?: boolean;
}

export default function StudentStatsWidget({
  showNextSession = true,
  showCompletedSessions = true,
  showScheduledSessions = true,
  showActiveCourses = true,
}: StudentStatsWidgetProps) {
  const [stats, setStats] = useState<StudentStatsResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await thriveClient.getStudentStats();
        setStats(data);
      } catch (err) {
        if (err instanceof ThriveApiError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="student-stats-widget loading">
        <p>Loading your stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-stats-widget error">
        <p>Error loading stats: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="student-stats-widget">
      {showNextSession && stats.nextSession && (
        <div className="stat-card next-session">
          <h3 className="stat-label">Next Session</h3>
          <div className="stat-content">
            <div className="session-time">
              {formatDateTime(stats.nextSession.startAt)}
            </div>
            <div className="session-teacher">
              with {stats.nextSession.teacherName}
            </div>
            <div className="session-type">{stats.nextSession.classType}</div>
          </div>
        </div>
      )}

      {showCompletedSessions && (
        <div className="stat-card completed-sessions">
          <h3 className="stat-label">Classes Attended</h3>
          <div className="stat-value">{stats.totalCompleted}</div>
        </div>
      )}

      {showScheduledSessions && (
        <div className="stat-card scheduled-sessions">
          <h3 className="stat-label">Upcoming Sessions</h3>
          <div className="stat-value">{stats.totalScheduled}</div>
        </div>
      )}

      {showActiveCourses && (
        <div className="stat-card active-courses">
          <h3 className="stat-label">Active Courses</h3>
          <div className="stat-value">{stats.activeCourses}</div>
        </div>
      )}
    </div>
  );
}
