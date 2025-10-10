import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import type { AvailabilityEvent, Teacher } from "../../../../types/calendar";
import { useGetTeachers } from "../../../hooks/get-teachers";
import { useStudentCredits } from "../../../hooks/use-student-credits";

import Header from "./Header";
import SelectedTeacherDetails from "./SelectedTeacherDetails";

type ModalAvailabilityEvent = AvailabilityEvent & {
  startLocal?: string;
  endLocal?: string;
  user?: any;
  currentUser?: any;
};

export default function AvailabilityModalContent({
  event,
}: {
  event: ModalAvailabilityEvent;
}) {
  const { loading: loadingTeachers, teachers } = useGetTeachers();

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
  const detailsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedTeacher && detailsRef.current) {
      try {
        detailsRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } catch {
        /* no-op */
      }
    }
  }, [selectedTeacher]);

  return (
    <div
      className="selected-event-modal__availability"
      style={{
        width: "95vw",
        height: "90vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--wp--preset--font-family--inter)",
        background: "var(--wp--preset--color--background)",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Header
          event={event}
          selectedTeacher={selectedTeacher}
          setSelectedTeacher={setSelectedTeacher}
          teachers={teachers}
          loadingTeachers={loadingTeachers}
        />

        {selectedTeacher && (
          <div
            ref={detailsRef}
            style={{
              flex: 1,
              overflowY: "auto",
              borderTop: "1px solid var(--wp--preset--color--gray-200)",
            }}
          >
            <SelectedTeacherDetails
              selectedTeacher={selectedTeacher}
              setSelectedTeacher={setSelectedTeacher}
            />
          </div>
        )}
      </div>
    </div>
  );
}
