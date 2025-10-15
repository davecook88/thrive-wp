import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import { getCalendarContextSafe } from "@thrive/shared/types/calendar-utils";

import TeacherPicker from "./components/TeacherPicker";

const ELEMENT_CLASS = ".thrive-teacher-picker";

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll<HTMLElement>(ELEMENT_CLASS).forEach((container) => {
    if (!container) return;

    // Check if already mounted
    if ((container as any)._reactRoot) return;

    const root = createRoot(container);
    (container as any)._reactRoot = root;

    // Read attributes from data attributes
    const heading =
      container.getAttribute("data-heading") || "Choose a Teacher";
    const showFilters = container.getAttribute("data-show-filters") === "1";

    // Auto-select first teacher for calendar context
    const teachersData = (container as any)._teachersData;
    if (teachersData && teachersData.length > 0) {
      const contextApi = getCalendarContextSafe(container);
      if (contextApi && typeof contextApi.setSelectedTeacherId === "function") {
        contextApi.setSelectedTeacherId(String(teachersData[0].userId));
      }
    }

    // Render the React component
    root.render(
      createElement(TeacherPicker, {
        heading,
        showFilters,
        querySelector: ELEMENT_CLASS,
      }),
    );
  });
});
