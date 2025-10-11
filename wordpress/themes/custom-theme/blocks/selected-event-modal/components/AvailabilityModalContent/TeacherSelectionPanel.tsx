import type { Teacher } from "../../../../types/calendar";
import { TeacherSelectionRow } from "../../../../components";

interface TeacherSelectionPanelProps {
  teachers: Teacher[];
  selectedTeacher: Teacher | null;
  onTeacherSelect: (teacher: Teacher | null) => void;
  loading: boolean;
  availableTeacherCount: number;
}

export default function TeacherSelectionPanel({
  teachers,
  selectedTeacher,
  onTeacherSelect,
  loading,
  availableTeacherCount,
}: TeacherSelectionPanelProps) {
  return (
    <div
      style={{
        flex: "0 0 400px",
        padding: "2rem",
        background: "var(--wp--preset--color--background)",
        borderRight: "1px solid var(--wp--preset--color--gray-200)",
        overflowY: "auto",
      }}
    >
      <h3
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "var(--wp--preset--color--foreground)",
        }}
      >
        Choose which teacher you would like to book with
      </h3>
      <div
        style={{
          fontSize: "0.9rem",
          color: "var(--wp--preset--color--gray-600)",
          marginBottom: "1.5rem",
        }}
      >
        {availableTeacherCount} teacher
        {availableTeacherCount !== 1 ? "s" : ""} available for this time slot
      </div>

      <TeacherSelectionRow
        teachers={teachers}
        selectedTeacher={selectedTeacher}
        onTeacherSelect={onTeacherSelect}
        loading={loading}
      />
    </div>
  );
}
