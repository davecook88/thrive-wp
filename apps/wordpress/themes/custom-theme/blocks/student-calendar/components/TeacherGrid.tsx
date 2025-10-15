import { PublicTeacherDto } from "@thrive/shared/types/teachers";
import type { Teacher } from "@thrive/shared/calendar";
interface TeacherGridProps {
  teachers: Teacher[];
  selectedTeacherIds: number[];
  toggleTeacher: (id: number) => void;
}

export default function TeacherGrid({
  teachers,
  selectedTeacherIds,
  toggleTeacher,
}: TeacherGridProps) {
  const getInitials = (t: PublicTeacherDto) =>
    (t.displayName || "T").slice(0, 1).toUpperCase();

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 8,
          color: "#374151",
        }}
      >
        Filter by Teacher
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "8px",
        }}
      >
        {teachers.map((t) => {
          const isSelected = selectedTeacherIds.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTeacher(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 10,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: isSelected ? "white" : "#f9fafb",
                cursor: "pointer",
                textAlign: "left",
                opacity: isSelected ? 1 : 0.5,
                transition: "all 150ms ease",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: isSelected
                    ? "var(--wp--preset--color--accent, #10b981)"
                    : "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isSelected ? "white" : "#374151",
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {getInitials(t)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    marginBottom: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.displayName.trim()}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
