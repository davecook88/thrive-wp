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
        flex: 1,
        padding: "1.5rem 2rem 2rem",
        overflowY: "auto",
        background: "var(--wp--preset--color--gray-50)",
      }}
    >
      <div
        style={{
          background: "var(--wp--preset--color--background)",
          borderRadius: 16,
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          padding: "1.25rem 1.25rem 1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h3 style={{ margin: 0 }}>About {selectedTeacher.name}</h3>
          <button
            type="button"
            onClick={() => setSelectedTeacher(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--wp--preset--color--accent)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Change teacher
          </button>
        </div>

        <TeacherDetails teacher={selectedTeacher} />
      </div>
    </section>
  );
}
