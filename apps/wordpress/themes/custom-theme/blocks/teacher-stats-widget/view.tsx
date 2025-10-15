import { createRoot } from "react-dom/client";
import TeacherStatsWidget from "./TeacherStatsWidget";

document.addEventListener("DOMContentLoaded", () => {
  const containers = document.querySelectorAll<HTMLElement>(
    ".wp-block-custom-theme-teacher-stats-widget"
  );

  containers.forEach((container) => {
    const root = createRoot(container);

    // Read attributes from data attributes
    const showNextSession = container.dataset.showNextSession !== "false";
    const showCompletedSessions =
      container.dataset.showCompletedSessions !== "false";
    const showScheduledSessions =
      container.dataset.showScheduledSessions !== "false";
    const showActiveStudents = container.dataset.showActiveStudents !== "false";

    root.render(
      <TeacherStatsWidget
        showNextSession={showNextSession}
        showCompletedSessions={showCompletedSessions}
        showScheduledSessions={showScheduledSessions}
        showActiveStudents={showActiveStudents}
      />
    );
  });
});
