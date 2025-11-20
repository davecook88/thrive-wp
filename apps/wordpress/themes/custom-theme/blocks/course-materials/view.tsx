import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import { StudentCourseMaterials } from "./StudentCourseMaterials";
import "./style.css";

const ELEMENT_CLASS = ".student-course-materials-block";

// Function to mount all StudentCourseMaterials blocks
const mountBlocks = () => {
  document.querySelectorAll<HTMLElement>(ELEMENT_CLASS).forEach((container) => {
    if (!container) return;

    // Check if already mounted (has React root)
    if (container.dataset.mounted === "true") return;
    container.dataset.mounted = "true";

    const root = createRoot(container);

    // Read attributes from data attributes
    const courseStepId = parseInt(
      container.getAttribute("data-course-step-id") || "0",
    );
    const studentPackageId = parseInt(
      container.getAttribute("data-student-package-id") || "0",
    );

    console.log("Mounting StudentCourseMaterials block", {
      courseStepId,
      studentPackageId,
    });

    if (courseStepId > 0) {
      // Render the React component
      root.render(
        createElement(StudentCourseMaterials, {
          courseStepId,
          studentPackageId,
        }),
      );
    } else {
      console.error("StudentCourseMaterials: Missing courseStepId");
    }
  });
};

// Mount blocks if DOM is already ready
if (
  document.readyState === "loading" ||
  document.readyState === "interactive"
) {
  // DOM is still loading, wait for DOMContentLoaded
  document.addEventListener("DOMContentLoaded", mountBlocks);
} else {
  // DOM is already loaded (e.g., script loaded via async/defer)
  mountBlocks();
}
