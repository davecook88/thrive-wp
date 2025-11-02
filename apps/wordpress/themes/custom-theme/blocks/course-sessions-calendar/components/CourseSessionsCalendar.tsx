import { useEffect, useState, useRef } from "@wordpress/element";
import { thriveClient } from "../../../../../shared/thrive";
import type { ClassEvent } from "@thrive/shared/types/events";

interface CourseSessionsCalendarProps {
  courseCode: string;
  showFutureOnly: boolean;
  defaultView: "week" | "month";
  height: number;
  showHeading: boolean;
  headingText: string;
}

interface ThriveCalendarElement extends HTMLElement {
  events: ClassEvent[];
}

export default function CourseSessionsCalendar({
  courseCode,
  showFutureOnly,
  defaultView,
  height,
  showHeading,
  headingText,
}: CourseSessionsCalendarProps) {
  const [sessions, setSessions] = useState<ClassEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const calendarRef = useRef<ThriveCalendarElement | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await thriveClient.fetchCourseSessions(
          courseCode,
          showFutureOnly,
        );
        setSessions(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching sessions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load sessions",
        );
      } finally {
        setLoading(false);
      }
    };

    if (courseCode) {
      void fetchSessions();
    }
  }, [courseCode, showFutureOnly]);

  useEffect(() => {
    if (calendarRef.current && !loading && sessions.length > 0) {
      calendarRef.current.events = sessions;
    }
  }, [sessions, loading]);

  if (loading) {
    return (
      <div className="course-calendar course-calendar--loading">
        <p>Loading calendar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-calendar course-calendar--error">
        <p>Error loading calendar: {error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="course-calendar course-calendar--empty">
        {showHeading && (
          <h2 className="course-calendar__heading">{headingText}</h2>
        )}
        <p>No sessions scheduled yet.</p>
      </div>
    );
  }

  return (
    <div className="course-calendar">
      {showHeading && (
        <h2 className="course-calendar__heading">{headingText}</h2>
      )}
      <thrive-calendar
        ref={calendarRef}
        view={defaultView}
        view-height={height}
        show-classes
        show-bookings={false}
        readonly
      />
    </div>
  );
}
