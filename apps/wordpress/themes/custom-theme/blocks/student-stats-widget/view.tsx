import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import StudentStatsWidget from "./StudentStatsWidget";

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("student-stats-widget-root");
  if (!container) return;

  const root = createRoot(container);

  // Read attributes from data attributes
  const showNextSession = container.getAttribute("data-show-next-session") === "1";
  const showCompleted = container.getAttribute("data-show-completed") === "1";
  const showScheduled = container.getAttribute("data-show-scheduled") === "1";
  const showCourses = container.getAttribute("data-show-courses") === "1";

  const props = {
    showNextSession,
    showCompletedSessions: showCompleted,
    showScheduledSessions: showScheduled,
    showActiveCourses: showCourses,
  };

  // Render the React component
  root.render(createElement(StudentStatsWidget, props));
});
