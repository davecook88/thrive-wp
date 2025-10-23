import { useEffect, useState } from "@wordpress/element";
import { useGetTeachers } from "../hooks/get-teachers";
import { ServiceType } from "@thrive/shared/types/class-types";

interface BookingSessionDetailsAttributes {
  heading: string;
  showTeacherName: boolean;
  showDateTime: boolean;
  dateTimeFormat: string;
  errorMessage: string;
}

interface BookingSessionDetailsComponentProps {
  attributes: BookingSessionDetailsAttributes;
}

interface GroupClassSession {
  id: number;
  startAt: string;
  endAt: string;
  teacherId: number;
  type: string;
  groupClass?: {
    id: number;
    title: string;
  };
}

const BookingSessionDetailsComponent: React.FC<
  BookingSessionDetailsComponentProps
> = ({ attributes }) => {
  const { heading, showTeacherName, showDateTime, errorMessage } = attributes;

  const [queryParams, setQueryParams] = useState<{
    start: string;
    end: string;
    teacher: string;
    sessionId: string | null;
    serviceType: ServiceType | null;
  }>({
    start: "",
    end: "",
    teacher: "",
    sessionId: null,
    serviceType: null,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [groupSession, setGroupSession] = useState<GroupClassSession | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { getTeacherById } = useGetTeachers();
  const [teacherName, setTeacherName] = useState<string>("");

  /**
   * Fetches a session by its ID from the API
   */
  const fetchGroupSession = async (
    sessionId: number,
  ): Promise<GroupClassSession | null> => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);

      if (!response.ok) {
        console.error("Failed to fetch session:", response.status);
        return null;
      }

      const session = await response.json();
      return session;
    } catch (error) {
      console.error("Error fetching session:", error);
      return null;
    }
  };

  useEffect(() => {
    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("sessionId");
    const serviceType = urlParams.get("serviceType") as ServiceType | null;
    const start = urlParams.get("start") || "";
    const end = urlParams.get("end") || "";
    const teacher = urlParams.get("teacher") || "";

    setQueryParams({
      start,
      end,
      teacher,
      sessionId,
      serviceType,
    });

    // For GROUP classes, we need to fetch the session details using the sessionId
    if (sessionId && serviceType === "GROUP") {
      setIsLoading(true);
      fetchGroupSession(parseInt(sessionId, 10))
        .then((session) => {
          if (session) {
            setGroupSession(session);
            setErrors([]);
          } else {
            setErrors(["Session not found"]);
          }
        })
        .catch((err) => {
          console.error("Error fetching session:", err);
          setErrors(["Failed to fetch session details"]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // For PRIVATE sessions, validate the URL parameters as before
      const newErrors: string[] = [];
      const isIsoLike = (s: string) =>
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?Z$/.test(s);

      if (!isIsoLike(start)) newErrors.push("Invalid or missing start time.");
      if (!isIsoLike(end)) newErrors.push("Invalid or missing end time.");
      if (!teacher || !/^\d+$/.test(teacher))
        newErrors.push("Invalid or missing teacher.");

      setErrors(newErrors);
    }
  }, []);

  useEffect(() => {
    const fetchTeacherName = async (teacherId: number) => {
      const teacher = await getTeacherById(teacherId);
      if (teacher) {
        setTeacherName(teacher.displayName ?? "");
      }
    };

    if (queryParams.teacher && !errors.length) {
      const teacherId = parseInt(queryParams.teacher, 10);
      void fetchTeacherName(teacherId);
    } else if (groupSession?.teacherId) {
      void fetchTeacherName(groupSession.teacherId);
    }
  }, [queryParams.teacher, errors, getTeacherById, groupSession?.teacherId]);

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      // Simple format, can be improved to match PHP format
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="booking-session-details-block">
        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px 18px",
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", color: "#374151" }}>{heading}</h3>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p>Loading session details...</p>
          </div>
        </section>
      </div>
    );
  }

  if (errors.length > 0) {
    return (
      <div className="booking-session-details-block">
        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px 18px",
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", color: "#374151" }}>{heading}</h3>
          <div
            className="notice notice-error"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: "12px 16px",
              borderRadius: "10px",
            }}
          >
            <p style={{ margin: 0 }}>{errorMessage}</p>
            <ul style={{ margin: "8px 0 0 18px" }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    );
  }

  // Use groupSession data if we're dealing with a GROUP class
  const isGroupClass = queryParams.serviceType === "GROUP" && groupSession;
  const startTime = isGroupClass ? groupSession?.startAt : queryParams.start;
  const endTime = isGroupClass ? groupSession?.endAt : queryParams.end;
  const classTitle = isGroupClass ? groupSession?.groupClass?.title : null;

  return (
    <div className="booking-session-details-block">
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "16px 18px",
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", color: "#374151" }}>{heading}</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            gap: "8px",
            alignItems: "center",
          }}
        >
          {isGroupClass && (
            <>
              <div style={{ color: "#6b7280", fontWeight: 600 }}>Class</div>
              <div>{classTitle || "Group Class"}</div>
            </>
          )}
          {showDateTime && (
            <>
              <div style={{ color: "#6b7280", fontWeight: 600 }}>
                Start Time
              </div>
              <div>{formatDateTime(startTime)}</div>
              <div style={{ color: "#6b7280", fontWeight: 600 }}>End Time</div>
              <div>{formatDateTime(endTime)}</div>
            </>
          )}
          {showTeacherName && (
            <>
              <div style={{ color: "#6b7280", fontWeight: 600 }}>Teacher</div>
              <div>
                {teacherName ||
                  `Teacher #${isGroupClass ? groupSession?.teacherId : queryParams.teacher}`}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default BookingSessionDetailsComponent;
