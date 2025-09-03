import { useEffect, useState } from "@wordpress/element";
import { Button } from "@wordpress/components";
import { getCalendarContextSafe } from "../../../types/calendar-utils";
import type { CalendarEvent } from "../../../types/calendar";

interface Teacher {
  userId: number;
  teacherId: number;
  firstName: string;
  lastName: string;
  name: string;
  bio: string | null;
}

interface TeacherPickerProps {
  heading: string;
  showFilters: boolean;
}

export default function TeacherPicker({
  heading,
  showFilters,
}: TeacherPickerProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    null
  );

  const API_BASE = "/api";

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/teachers`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        setTeachers([]);
        return;
      }
      const data = (await res.json()) as Teacher[];
      setTeachers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSelect = (teacher: Teacher) => {
    const teacherUserId = String(teacher.userId);
    setSelectedTeacherId(teacherUserId);

    // Communicate with calendar context using the safe helper function
    const container = document.querySelector(
      ".thrive-teacher-picker"
    ) as HTMLElement;
    if (container) {
      const contextApi = getCalendarContextSafe(container);
      if (contextApi && typeof contextApi.setSelectedTeacherId === "function") {
        contextApi.setSelectedTeacherId(teacherUserId);
      }
    }
  };

  const getInitials = (teacher: Teacher) => {
    return (teacher.firstName || teacher.name || "T").slice(0, 1).toUpperCase();
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div>Loading teachers...</div>
      </div>
    );
  }

  return (
    <div className="thrive-teacher-picker__wrap">
      <h3 style={{ margin: "0 0 8px 0" }}>{heading}</h3>

      {showFilters && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <Button variant="primary">Private</Button>
          <Button variant="secondary" disabled>
            Group
          </Button>
          <Button variant="secondary" disabled>
            Semi-Private
          </Button>
        </div>
      )}

      {!teachers.length ? (
        <div
          style={{
            color: "#6b7280",
            fontSize: "14px",
          }}
        >
          No teachers available yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "10px",
          }}
        >
          {teachers.map((teacher) => (
            <button
              key={teacher.userId}
              type="button"
              onClick={() => handleTeacherSelect(teacher)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                background:
                  selectedTeacherId === String(teacher.userId)
                    ? "#f3f4f6"
                    : "white",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  selectedTeacherId === String(teacher.userId)
                    ? "#f3f4f6"
                    : "white";
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#374151",
                  fontWeight: "700",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {getInitials(teacher)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "14px",
                    marginBottom: "2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {teacher.name ||
                    `${teacher.firstName} ${teacher.lastName}`.trim()}
                </div>
                {teacher.bio && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {teacher.bio}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
