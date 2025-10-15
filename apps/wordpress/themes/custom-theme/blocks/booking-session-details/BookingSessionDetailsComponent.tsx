import { useEffect, useState } from "@wordpress/element";
import { useGetTeachers } from "../hooks/get-teachers";

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

declare global {
  interface Window {
    __AUTH__?: any;
  }
}

const BookingSessionDetailsComponent: React.FC<
  BookingSessionDetailsComponentProps
> = ({ attributes }) => {
  const { heading, showTeacherName, showDateTime, errorMessage } = attributes;

  const [queryParams, setQueryParams] = useState<{
    start: string;
    end: string;
    teacher: string;
  }>({
    start: "",
    end: "",
    teacher: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const {
    teachers,
    loading: teachersLoading,
    getTeacherById,
  } = useGetTeachers();
  const [teacherName, setTeacherName] = useState<string>("");

  useEffect(() => {
    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    const start = urlParams.get("start") || "";
    const end = urlParams.get("end") || "";
    const teacher = urlParams.get("teacher") || "";

    setQueryParams({ start, end, teacher });

    // Validate
    const newErrors: string[] = [];
    const isIsoLike = (s: string) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?Z$/.test(s);

    if (!isIsoLike(start)) newErrors.push("Invalid or missing start time.");
    if (!isIsoLike(end)) newErrors.push("Invalid or missing end time.");
    if (!teacher || !/^\d+$/.test(teacher))
      newErrors.push("Invalid or missing teacher.");

    setErrors(newErrors);

    // Check login
    setIsLoggedIn(!!window.__AUTH__ && Object.keys(window.__AUTH__).length > 0);
  }, []);

  useEffect(() => {
    if (queryParams.teacher && !errors.length) {
      const teacherId = parseInt(queryParams.teacher, 10);
      getTeacherById(teacherId).then((teacher) => {
        if (teacher) {
          setTeacherName(teacher.name || `Teacher #${teacherId}`);
        } else {
          setTeacherName(`Teacher #${teacherId}`);
        }
      });
    }
  }, [queryParams.teacher, errors, getTeacherById]);

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      // Simple format, can be improved to match PHP format
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

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
          {showDateTime && (
            <>
              <div style={{ color: "#6b7280", fontWeight: 600 }}>
                Start Time
              </div>
              <div>{formatDateTime(queryParams.start)}</div>
              <div style={{ color: "#6b7280", fontWeight: 600 }}>End Time</div>
              <div>{formatDateTime(queryParams.end)}</div>
            </>
          )}
          {showTeacherName && (
            <>
              <div style={{ color: "#6b7280", fontWeight: 600 }}>Teacher</div>
              <div>{teacherName || `Teacher #${queryParams.teacher}`}</div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default BookingSessionDetailsComponent;
