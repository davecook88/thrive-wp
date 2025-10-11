import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "@wordpress/element";
import { getCalendarContextSafe } from "../../types/calendar-utils";
import type { Teacher } from "../../types/calendar";
import TeacherInfo from "./components/TeacherInfo";
import TeacherInfoSkeleton from "./components/TeacherInfoSkeleton";
import "./teacher-info.css";

const ELEMENT_CLASS = ".thrive-teacher-info";

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
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        setLoading(true);

        // If teacherId is provided, fetch that specific teacher
        if (teacherId) {
          const response = await fetch(`/api/teachers/${teacherId}`);
          if (response.ok) {
            const data = await response.json();
            setTeacher(data);
          }
        } else {
          // Try to get selected teacher from calendar context
          const contextApi = getCalendarContextSafe(container);
          if (contextApi && contextApi.selectedTeacherId) {
            const response = await fetch(
              `/api/teachers/${contextApi.selectedTeacherId}`
            );
            if (response.ok) {
              const data = await response.json();
              setTeacher(data);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch teacher:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacher();

    // If no teacherId, listen for changes in calendar context
    if (!teacherId) {
      const contextApi = getCalendarContextSafe(container);
      if (contextApi) {
        // Re-fetch when selected teacher changes
        // Note: This would require the calendar context to notify of teacher changes
        // For now, we'll just fetch once
      }
    }
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

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll<HTMLElement>(ELEMENT_CLASS).forEach((container) => {
    if (!container) return;

    // Check if already mounted
    if ((container as any)._reactRoot) return;

    const root = createRoot(container);
    (container as any)._reactRoot = root;

    // Read attributes from data attributes
    const teacherId = container.getAttribute("data-teacher-id");
    const layout =
      (container.getAttribute("data-layout") as
        | "horizontal"
        | "vertical"
        | "card") || "horizontal";
    const size =
      (container.getAttribute("data-size") as "small" | "medium" | "large") ||
      "medium";
    const showAvatar = container.getAttribute("data-show-avatar") === "1";
    const showLocation = container.getAttribute("data-show-location") === "1";
    const showBio = container.getAttribute("data-show-bio") === "1";
    const showSpecialties =
      container.getAttribute("data-show-specialties") === "1";
    const showStats = container.getAttribute("data-show-stats") === "1";
    const showMap = container.getAttribute("data-show-map") === "1";
    const backgroundColor =
      container.getAttribute("data-background-color") || "";
    const borderRadius = container.getAttribute("data-border-radius") || "8px";

    // Render the React component
    root.render(
      createElement(TeacherInfoWrapper, {
        teacherId: teacherId ? parseInt(teacherId, 10) : null,
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
      })
    );
  });
});
