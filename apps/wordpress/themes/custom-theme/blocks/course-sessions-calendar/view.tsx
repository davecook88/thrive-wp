import { createRoot } from "@wordpress/element";
import CourseSessionsCalendar from "./components/CourseSessionsCalendar";

document.addEventListener("DOMContentLoaded", () => {
  const blocks = document.querySelectorAll(
    ".wp-block-custom-theme-course-sessions-calendar",
  );

  blocks.forEach((block) => {
    const courseCode = block.getAttribute("data-course-code");
    const showFutureOnly =
      block.getAttribute("data-show-future-only") === "true";
    const defaultView = (block.getAttribute("data-default-view") || "week") as
      | "week"
      | "month";
    const height = parseInt(block.getAttribute("data-height") || "600", 10);
    const showHeading = block.getAttribute("data-show-heading") === "true";
    const headingText =
      block.getAttribute("data-heading-text") || "Course Schedule";

    if (!courseCode) {
      return;
    }

    const root = createRoot(block);
    root.render(
      <CourseSessionsCalendar
        courseCode={courseCode}
        showFutureOnly={showFutureOnly}
        defaultView={defaultView}
        height={height}
        showHeading={showHeading}
        headingText={headingText}
      />,
    );
  });
});
