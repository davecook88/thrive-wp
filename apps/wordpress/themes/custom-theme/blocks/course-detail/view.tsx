import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import CourseDetail from "./components/CourseDetail";

const ELEMENT_CLASS = ".course-detail-block";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll<HTMLElement>(ELEMENT_CLASS).forEach((container) => {
    if (!container) return;

    const showDescription =
      container.getAttribute("data-show-description") === "1";
    const showLevelBadges =
      container.getAttribute("data-show-level-badges") === "1";
    const showPrice = container.getAttribute("data-show-price") === "1";
    const showStepCount =
      container.getAttribute("data-show-step-count") === "1";
    const defaultView =
      (container.getAttribute("data-default-view") as "week" | "month") ||
      "week";
    const calendarHeight = parseInt(
      container.getAttribute("data-calendar-height") || "600",
      10,
    );
    const courseCode = container.getAttribute("data-course-code") || "";

    const root = createRoot(container);
    root.render(
      createElement(CourseDetail, {
        showDescription,
        showLevelBadges,
        showPrice,
        showStepCount,
        defaultView,
        calendarHeight,
        courseCode,
      }),
    );
  });
});
