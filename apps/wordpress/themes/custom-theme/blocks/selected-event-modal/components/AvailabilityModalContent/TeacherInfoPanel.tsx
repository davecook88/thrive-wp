import { PublicTeacherDto } from "@thrive/shared/types/teachers";
import TeacherInfo from "../../../teacher-info/components/TeacherInfo";
import EmptyTeacherState from "./EmptyTeacherState";

interface TeacherInfoPanelProps {
  selectedTeacher: PublicTeacherDto | null;
}

export default function TeacherInfoPanel({
  selectedTeacher,
}: TeacherInfoPanelProps) {
  return (
    <div
      style={{
        flex: 1,
        padding: "2rem",
        background: "var(--wp--preset--color--gray-50)",
        overflowY: "auto",
      }}
    >
      {selectedTeacher ? (
        <div>
          <TeacherInfo
            teacher={selectedTeacher}
            layout="vertical"
            size="medium"
            showAvatar={true}
            showLocation={true}
            showBio={true}
            showSpecialties={true}
            showStats={false}
            showMap={false}
            backgroundColor="white"
            borderRadius="12px"
          />
        </div>
      ) : (
        <EmptyTeacherState />
      )}
    </div>
  );
}
