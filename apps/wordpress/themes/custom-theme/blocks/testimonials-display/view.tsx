import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import TestimonialsDisplay from "./components/TestimonialsDisplay";

const ELEMENT_CLASS = ".testimonials-display-block";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll<HTMLElement>(ELEMENT_CLASS).forEach((container) => {
    if (!container) return;

    const root = createRoot(container);

    // Read attributes from data attributes
    const layout = (container.getAttribute("data-layout") || "grid") as "grid" | "carousel" | "list";
    const columns = parseInt(container.getAttribute("data-columns") || "3", 10);
    const limit = parseInt(container.getAttribute("data-limit") || "6", 10);
    const teacherId = parseInt(container.getAttribute("data-teacher-id") || "0", 10);
    const courseProgramId = parseInt(container.getAttribute("data-course-program-id") || "0", 10);
    const minRating = parseInt(container.getAttribute("data-min-rating") || "1", 10);
    const featuredOnly = container.getAttribute("data-featured-only") === "1";
    const showRating = container.getAttribute("data-show-rating") === "1";
    const showDate = container.getAttribute("data-show-date") === "1";

    root.render(
      createElement(TestimonialsDisplay, {
        layout,
        columns,
        limit,
        teacherId: teacherId > 0 ? teacherId : undefined,
        courseProgramId: courseProgramId > 0 ? courseProgramId : undefined,
        minRating,
        featuredOnly,
        showRating,
        showDate,
      })
    );
  });
});
