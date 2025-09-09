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
        paddingBottom: "0.5rem",
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
            padding: "1rem 0.5rem",
            borderRadius: "var(--wp--custom--border-radius)",
            border:
              selectedTeacher?.teacherId === t.teacherId
                ? "2px solid var(--wp--preset--color--primary)"
                : "2px solid transparent",
            background:
              selectedTeacher?.teacherId === t.teacherId
                ? "var(--wp--preset--color--gray-50)"
                : "transparent",
            transition: "all 0.3s ease",
            position: "relative",
          }}
          onMouseEnter={(e) => {
            if (selectedTeacher?.teacherId !== t.teacherId) {
              e.currentTarget.style.background =
                "var(--wp--preset--color--gray-50)";
              e.currentTarget.style.borderColor =
                "var(--wp--preset--color--gray-300)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedTeacher?.teacherId !== t.teacherId) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }
          }}
        >
          <img
            src={
              (t as any)?.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.name}`
            }
            alt={t.name}
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              objectFit: "cover",
              margin: "0 auto 0.75rem",
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
              marginBottom: "0.25rem",
            }}
          >
            {t.name}
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--wp--preset--color--gray-600)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ marginRight: "0.25rem" }}>⭐</span>
            4.9
          </div>
          {selectedTeacher?.teacherId === t.teacherId && (
            <div
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "0.5rem",
                background: "var(--wp--preset--color--primary)",
                color: "white",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: "bold",
              }}
            >
              ✓
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
