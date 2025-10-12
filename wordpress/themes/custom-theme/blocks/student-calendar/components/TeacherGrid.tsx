import type { Teacher } from "../../../../../shared/types/calendar";
import { Dispatch, SetStateAction } from "react";

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
  const getInitials = (t: Teacher) =>
    (t.firstName || t.name || "T").slice(0, 1).toUpperCase();

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
        {teachers.map((t) => (
          <button
            key={t.teacherId}
            type="button"
            onClick={() => toggleTeacher(t.teacherId)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 10,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: selectedTeacherIds.includes(t.teacherId)
                ? "white"
                : "#f9fafb",
              cursor: "pointer",
              textAlign: "left",
              opacity: selectedTeacherIds.includes(t.teacherId) ? 1 : 0.5,
              transition: "all 150ms ease",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: selectedTeacherIds.includes(t.teacherId)
                  ? "var(--wp--preset--color--accent, #10b981)"
                  : "#e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: selectedTeacherIds.includes(t.teacherId)
                  ? "white"
                  : "#374151",
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
                {t.name || `${t.firstName} ${t.lastName}`.trim()}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
