import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import CourseList from "./components/CourseList";

const ELEMENT_CLASS = ".course-list-block";

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll<HTMLElement>(ELEMENT_CLASS).forEach((container) => {
    if (!container) return;

    const root = createRoot(container);

    // Read attributes from data attributes
    const columns = parseInt(container.getAttribute("data-columns") || "3", 10);
    const showLevelBadges =
      container.getAttribute("data-show-level-badges") === "1";
    const showPrice = container.getAttribute("data-show-price") === "1";
    const showEnrollmentCount =
      container.getAttribute("data-show-enrollment-count") === "1";
    const showCohortInfo =
      container.getAttribute("data-show-cohort-info") === "1";
    const showDescription =
      container.getAttribute("data-show-description") === "1";
    const cardLayout =
      (container.getAttribute("data-card-layout") as
        | "image-top"
        | "image-side") || "image-top";
    const sortBy =
      (container.getAttribute("data-sort-by") as
        | "startDate"
        | "title"
        | "price") || "startDate";
    const sortOrder =
      (container.getAttribute("data-sort-order") as "asc" | "desc") || "asc";
    const showFilters = container.getAttribute("data-show-filters") === "1";
    const defaultLevelIdStr = container.getAttribute("data-default-level-id");
    const defaultLevelId = defaultLevelIdStr
      ? parseInt(defaultLevelIdStr, 10)
      : null;
    const pageSize = parseInt(
      container.getAttribute("data-page-size") || "12",
      10,
    );
    const showPagination =
      container.getAttribute("data-show-pagination") === "1";
    const imagePlaceholder =
      container.getAttribute("data-image-placeholder") || "";

    // Render the React component
    root.render(
      createElement(CourseList, {
        columns,
        showLevelBadges,
        showPrice,
        showEnrollmentCount,
        showCohortInfo,
        showDescription,
        cardLayout,
        sortBy,
        sortOrder,
        showFilters,
        defaultLevelId,
        pageSize,
        showPagination,
        imagePlaceholder,
      }),
    );
  });
});
