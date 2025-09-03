import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import { getCalendarContextSafe } from "../../types/calendar-utils";

import TeacherAvailability from "./components/TeacherAvailability";

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("teacher-availability-root");
  if (!container) return;
  const root = createRoot(container);

  // Read attributes from data attributes
  const heading =
    container.getAttribute("data-heading") || "Set Your Availability";
  const helpText =
    container.getAttribute("data-help-text") ||
    "Configure your weekly schedule and any exceptions.";
  const accentColor = container.getAttribute("data-accent-color") || "#9aa8ff";
  const showPreviewWeeks = parseInt(
    container.getAttribute("data-show-preview-weeks") || "2"
  );

  // Render the React component
  root.render(
    createElement(TeacherAvailability, {
      heading,
      helpText,
      accentColor,
      showPreviewWeeks,
    })
  );
  // Provide a helper on the container to access the context API for children
  const contextApi = getCalendarContextSafe(container);
  if (contextApi) {
    (container as any).__thriveCalCtxApi = contextApi;
  }
});
