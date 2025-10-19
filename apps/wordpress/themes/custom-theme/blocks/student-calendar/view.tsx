import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import StudentCalendar from "./components/StudentCalendar";

const ELEMENT_CLASS = ".student-calendar-block";

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll<HTMLElement>(ELEMENT_CLASS).forEach((container) => {
    if (!container) return;

    const root = createRoot(container);
    // container._reactRoot = root;

    // Read attributes from data attributes
    const view =
      (container.getAttribute("data-view") as
        | "week"
        | "day"
        | "month"
        | "list") || "week";
    const slotDuration = parseInt(
      container.getAttribute("data-slot-duration") || "30",
    );
    const snapTo = parseInt(container.getAttribute("data-snap-to") || "15");
    const viewHeight = parseInt(
      container.getAttribute("data-view-height") || "600",
    );

    // Render the React component
    root.render(
      createElement(StudentCalendar, {
        view,
        slotDuration,
        snapTo,
        viewHeight,
      }),
    );
  });
});
