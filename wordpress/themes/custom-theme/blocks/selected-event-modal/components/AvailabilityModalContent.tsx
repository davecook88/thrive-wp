import {
  createElement,
  useEffect,
  useMemo,
  useState,
} from "@wordpress/element";
import type { AvailabilityEvent, Teacher } from "../../../types/calendar";

type ModalAvailabilityEvent = AvailabilityEvent & {
  startLocal?: string;
  endLocal?: string;
  user?: any;
  currentUser?: any;
};
import { useGetTeachers } from "../../hooks/get-teachers";
import { useGetCalendarContext } from "../../hooks/get-context";
import {
  TeacherSelectionRow,
  TeacherDetails,
  BookingSection,
} from "../../../components";

export default function AvailabilityModalContent({
  event,
}: {
  event: ModalAvailabilityEvent;
}) {
  console.log("AvailabilityModalContent render", { window });
  const context = useGetCalendarContext(".thrive-teacher-picker");
  const {
    getTeacherById,
    loading: loadingTeachers,
    teachers,
  } = useGetTeachers(context);

  console.log({ loadingTeachers, teachers });

  const hasCredits = useMemo(() => {
    const user = (event as any)?.user || (event as any)?.currentUser || {};
    return (
      (typeof user?.credits === "number" && user.credits > 0) ||
      Boolean(user?.hasPackage) ||
      Boolean((event as any)?.userHasPackage)
    );
  }, [event]);

  const [bookingState, setBookingState] = useState<null | string>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const onBook = (useCredits = false) => {
    if (!selectedTeacher) return;

    setBookingState("pending");
    try {
      window.dispatchEvent(
        new CustomEvent("thrive-calendar:book", {
          detail: { event, teacher: selectedTeacher, useCredits },
        })
      );
    } catch (err) {
      if ((selectedTeacher as any)?.bookingUrl)
        window.location.href = (selectedTeacher as any).bookingUrl;
    }
    setTimeout(() => setBookingState("done"), 600);
  };

  return (
    <div
      className="selected-event-modal__availability"
      style={{
        width: "95vw",
        maxWidth: 1400,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--wp--preset--font-family--inter)",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "2rem 2rem 1rem",
          textAlign: "center",
          borderBottom: "1px solid var(--wp--preset--color--gray-200)",
        }}
      >
        <h1
          style={{
            margin: "0 0 0.5rem 0",
            fontSize: "2.5rem",
            fontWeight: "700",
            color: "var(--wp--preset--color--foreground)",
            lineHeight: "1.2",
          }}
        >
          Choose Your Teacher
        </h1>
        <div
          style={{
            fontSize: "1.1rem",
            color: "var(--wp--preset--color--gray-600)",
            marginBottom: "1rem",
          }}
        >
          {event?.startLocal}
          {event?.endLocal ? ` — ${event.endLocal}` : ""}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--wp--preset--color--gray-100)",
            padding: "0.5rem 1rem",
            borderRadius: "var(--wp--custom--border-radius)",
            fontSize: "0.9rem",
            fontWeight: "600",
            color: "var(--wp--preset--color--gray-600)",
          }}
        >
          <span style={{ marginRight: "0.5rem" }}>👥</span>
          {event?.teacherIds?.length ?? 0} Teacher
          {(event?.teacherIds?.length ?? 0) !== 1 ? "s" : ""} Available
        </div>
      </header>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Teacher Selection Row */}
        <section
          style={{
            padding: "1.5rem 2rem",
            borderBottom: selectedTeacher
              ? "1px solid var(--wp--preset--color--gray-200)"
              : "none",
          }}
        >
          <h3
          // style={{
          //   margin: "0 0 1rem 0",
          //   fontSize: "1.2rem",
          //   fontWeight: "600",
          //   color: "var(--wp--preset--color--foreground)",
          // }}
          >
            Select a Teacher
          </h3>

          <TeacherSelectionRow
            teachers={teachers}
            selectedTeacher={selectedTeacher}
            onTeacherSelect={setSelectedTeacher}
            loading={loadingTeachers}
          />
        </section>

        {/* Selected Teacher Details */}
        {selectedTeacher && (
          <section
            style={{
              flex: 1,
              padding: "2rem",
              overflowY: "auto",
              background: "var(--wp--preset--color--gray-50)",
            }}
          >
            <TeacherDetails teacher={selectedTeacher} />
          </section>
        )}

        {/* Booking Section */}
        <BookingSection
          selectedTeacher={selectedTeacher}
          hasCredits={hasCredits}
          bookingState={bookingState}
          onBook={onBook}
        />
      </div>
    </div>
  );
}
