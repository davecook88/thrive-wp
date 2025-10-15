import { useState, useEffect } from "@wordpress/element";
import TeacherInfo from "./components/TeacherInfo";
import TeacherInfoSkeleton from "./components/TeacherInfoSkeleton";
import "./teacher-info.css";
import { thriveClient } from "@thrive/shared/clients/thrive";
import { PublicTeacherDto } from "@thrive/shared/types/teachers";

interface TeacherInfoWrapperProps {
  teacherId: number | null;
  layout: "horizontal" | "vertical" | "card";
  size: "small" | "medium" | "large";
  showAvatar: boolean;
  showLocation: boolean;
  showBio: boolean;
  showSpecialties: boolean;
  showStats: boolean;
  showMap: boolean;
  backgroundColor: string;
  borderRadius: string;
  container: HTMLElement;
}

function TeacherInfoWrapper({
  teacherId,
  layout,
  size,
  showAvatar,
  showLocation,
  showBio,
  showSpecialties,
  showStats,
  showMap,
  backgroundColor,
  borderRadius,
  container,
}: TeacherInfoWrapperProps) {
  const [teacher, setTeacher] = useState<PublicTeacherDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId) return;
    thriveClient
      .fetchTeacher(teacherId)
      .then(setTeacher)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teacherId, container]);

  if (loading) {
    return (
      <TeacherInfoSkeleton
        layout={layout}
        size={size}
        showAvatar={showAvatar}
      />
    );
  }

  if (!teacher) {
    return null;
  }

  return (
    <TeacherInfo
      teacher={teacher}
      layout={layout}
      size={size}
      showAvatar={showAvatar}
      showLocation={showLocation}
      showBio={showBio}
      showSpecialties={showSpecialties}
      showStats={showStats}
      showMap={showMap}
      backgroundColor={backgroundColor}
      borderRadius={borderRadius}
    />
  );
}
