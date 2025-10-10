import { TeacherDetails } from "../../../../components";
import PackageBookingButton from "./PackageBookingButton";
import type { Teacher } from "../../../../types/calendar";

export default function SelectedTeacherDetails({
  selectedTeacher,
  setSelectedTeacher,
}: {
  selectedTeacher: Teacher;
  setSelectedTeacher: (t: Teacher | null) => void;
}) {
  return (
    <section
      style={{
        padding: "1.5rem 2rem 2rem",
        background: "var(--wp--preset--color--gray-50)",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: "1rem",
          fontWeight: 700,
          marginBottom: "1rem",
          color: "var(--wp--preset--color--foreground)",
        }}
      >
        About {selectedTeacher.name}
      </h3>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "1.25rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <TeacherDetails teacher={selectedTeacher} />
      </div>
    </section>
  );
}
