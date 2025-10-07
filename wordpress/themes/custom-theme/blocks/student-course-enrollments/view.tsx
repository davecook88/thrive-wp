import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import StudentCourseEnrollments from "./StudentCourseEnrollments";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("student-course-enrollments-root");
  if (!container) return;

  const root = createRoot(container);

  const showProgress = container.getAttribute("data-show-progress") === "1";
  const showNextSession = container.getAttribute("data-show-next-session") === "1";

  const props = {
    showProgress,
    showNextSession,
  };

  root.render(createElement(StudentCourseEnrollments, props));
});
