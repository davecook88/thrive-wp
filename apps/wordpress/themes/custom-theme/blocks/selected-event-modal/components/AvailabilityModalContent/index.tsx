import { useState } from "@wordpress/element";
import type { AvailabilityEvent } from "@thrive/shared/calendar";
import { useGetTeachers } from "../../../hooks/get-teachers";
import { useStudentCredits } from "../../../hooks/use-student-credits";
import { buildBookingUrl } from "../../../../utils/booking";

import Header from "./Header";
import TeacherSelectionPanel from "./TeacherSelectionPanel";
import TeacherInfoPanel from "./TeacherInfoPanel";
import PackagesFooter from "./PackagesFooter";
import { PublicTeacherDto } from "@thrive/shared";
import BookNowFooter from "./BookNowFooter";

interface User {
  ID: number;
  user_login: string;
  user_email: string;
  display_name: string;
}

export type ModalAvailabilityEvent = AvailabilityEvent & {
  startLocal?: string;
  endLocal?: string;
  user?: User;
  currentUser?: User;
};

export default function AvailabilityModalContent({
  event,
}: {
  event: ModalAvailabilityEvent;
}) {
  const { loading: loadingTeachers, teachers } = useGetTeachers();
  console.log("useGetTeachers", { loadingTeachers, teachers });
  const {
    packagesResponse,
    totalRemaining,
    refetch: refetchCredits,
  } = useStudentCredits();

  const [selectedTeacher, setSelectedTeacher] =
    useState<PublicTeacherDto | null>(null);

  console.log("AvailabilityModalContent render", {
    event,
    selectedTeacher,
    teachers,
    loadingTeachers,
    packagesResponse,
    totalRemaining,
  });

  const packages = packagesResponse?.packages ?? [];
  const hasPackages = packages.length > 0;

  const bookingConfirmationUrl = selectedTeacher
    ? (() => {
        try {
          return buildBookingUrl({
            startUtc: event.startUtc,
            endUtc: event.endUtc,
            teacherId: selectedTeacher.id,
            serviceType: event.type === "availability" ? "PRIVATE" : event.type,
          });
        } catch (error) {
          console.log("Error building booking URL", error);
          return null;
        }
      })()
    : null;

  return (
    <div
      className="selected-event-modal__availability"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--wp--preset--font-family--inter)",
        background: "var(--wp--preset--color--background)",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
        overflow: "hidden",
      }}
    >
      {/* Fixed Header with Booking Information */}
      <Header event={event} />

      {/* Main Content Area with Side-by-Side Layout */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0, // Important for flex children to respect overflow
        }}
      >
        {/* Left Side - Teacher Selection */}
        <TeacherSelectionPanel
          teachers={teachers}
          selectedTeacher={selectedTeacher}
          onTeacherSelect={setSelectedTeacher}
          loading={loadingTeachers}
          availableTeacherCount={event?.teacherIds?.length ?? 0}
        />

        {/* Right Side - Teacher Information */}
        <TeacherInfoPanel selectedTeacher={selectedTeacher} />
      </div>

      {/* Fixed Footer - Your Packages */}
      {hasPackages ? (
        <PackagesFooter
          packages={packages}
          selectedTeacher={selectedTeacher}
          event={event}
          bookingConfirmationUrl={bookingConfirmationUrl}
          totalRemaining={totalRemaining}
          onBookingSuccess={refetchCredits as () => Promise<void>}
        />
      ) : (
        <BookNowFooter bookingConfirmationUrl={bookingConfirmationUrl} />
      )}
    </div>
  );
}
