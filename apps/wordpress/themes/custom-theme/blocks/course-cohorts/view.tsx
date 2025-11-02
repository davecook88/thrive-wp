import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import CourseCohorts from "./components/CourseCohorts";

const ELEMENT_CLASS = ".course-cohorts-block";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll<HTMLElement>(ELEMENT_CLASS).forEach((container) => {
    if (!container) return;

    const showDescription =
      container.getAttribute("data-show-description") === "1";
    const showEnrollmentCount =
      container.getAttribute("data-show-enrollment-count") === "1";
    const ctaText = container.getAttribute("data-cta-text") || "Enroll";
    const courseCode = container.getAttribute("data-course-code") || "";

    const root = createRoot(container);
    root.render(
      createElement(CourseCohorts, {
        courseCode,
        showDescription,
        showEnrollmentCount,
        ctaText,
      }),
    );
  });
});
