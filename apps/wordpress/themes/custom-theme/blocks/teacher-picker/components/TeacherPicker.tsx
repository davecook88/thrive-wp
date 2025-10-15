import { Button } from "@wordpress/components";

import { useGetTeachers } from "../../hooks/get-teachers";
import { PublicTeacherDto } from "@thrive/shared/types/teachers";

interface TeacherPickerProps {
  heading: string;
  showFilters: boolean;
}

export default function TeacherPicker({
  heading,
  showFilters,
}: TeacherPickerProps) {
  const { teachers, loading, selectTeacherId, selectedTeachers } =
    useGetTeachers();
  const handleTeacherSelect = (teacher: PublicTeacherDto) => {
    selectTeacherId(teacher.id);
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
              key={teacher.id}
              type="button"
              onClick={() => handleTeacherSelect(teacher)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                background: selectedTeachers.some((t) => t.id === teacher.id)
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
                e.currentTarget.style.background = selectedTeachers.some(
                  (t) => t.id === teacher.id,
                )
                  ? "#f3f4f6"
                  : "white";
              }}
            >
              <img
                src={teacher.avatarUrl ?? undefined}
                alt={teacher.displayName}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                  border: "2px solid #e5e7eb",
                }}
              />
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
                  {teacher.displayName}
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
