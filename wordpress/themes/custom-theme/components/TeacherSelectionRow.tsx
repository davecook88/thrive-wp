import { useState } from "@wordpress/element";
import type { Teacher } from "../types/calendar";

interface TeacherSelectionRowProps {
  teachers: Teacher[];
  selectedTeacher: Teacher | null;
  onTeacherSelect: (teacher: Teacher) => void;
  loading?: boolean;
}

export default function TeacherSelectionRow({
  teachers,
  selectedTeacher,
  onTeacherSelect,
  loading = false,
}: TeacherSelectionRowProps) {
  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
          color: "var(--wp--preset--color--gray-600)",
        }}
      >
        <div style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>🔍</div>
        Finding the best teachers for you…
      </div>
    );
  }

  if (!teachers.length) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
          color: "var(--wp--preset--color--gray-600)",
          background: "var(--wp--preset--color--gray-50)",
          borderRadius: "var(--wp--custom--border-radius)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😔</div>
        <div
          style={{
            fontSize: "1.2rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          No teachers available right now
        </div>
        <div style={{ fontSize: "0.9rem" }}>
          Check back later or browse our other available times
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        overflowX: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "var(--wp--preset--color--gray-300) transparent",
      }}
    >
      {teachers.map((t) => (
        <div
          key={t.teacherId}
          onClick={() => onTeacherSelect(t)}
          style={{
            flex: "0 0 auto",
            width: "140px",
            textAlign: "center",
            cursor: "pointer",
            padding: "0.5rem",
            borderRadius: "var(--wp--custom--border-radius)",
            transition: "all 0.3s ease",
            position: "relative",
          }}
        >
          <img
            src={
              (t as any)?.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.name}`
            }
            alt={t.name}
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              objectFit: "cover",
              margin: "0 auto 0.25rem",
              border:
                selectedTeacher?.teacherId === t.teacherId
                  ? "3px solid var(--wp--preset--color--primary)"
                  : "3px solid var(--wp--preset--color--gray-200)",
              transition: "border-color 0.3s ease",
            }}
          />
          <div
            style={{
              fontWeight: "600",
              fontSize: "0.95rem",
              color: "var(--wp--preset--color--foreground)",
            }}
          >
            {t.name}
          </div>
        </div>
      ))}
    </div>
  );
}
