import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import CourseHeader from "./components/CourseHeader";

const ELEMENT_CLASS = ".course-header-block";

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
    const courseCode = container.getAttribute("data-course-code") || "";

    const root = createRoot(container);
    root.render(
      createElement(CourseHeader, {
        showDescription,
        showLevelBadges,
        showPrice,
        showStepCount,
        courseCode,
      }),
    );
  });
});
