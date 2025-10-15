import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import StudentClassCreditsComponent from "./StudentClassCreditsComponent";

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("student-class-credits-root");
  console.log("Container:", container);
  if (!container) return;
  const root = createRoot(container);

  // Read attributes from data attributes
  const creditsAttr = container.getAttribute("data-credits");
  const loading = container.getAttribute("data-loading") === "true";

  const credits = creditsAttr ? parseInt(creditsAttr, 10) : null;

  const props = {
    credits,
    loading,
    className: container.getAttribute("data-class") || undefined,
  };

  // Render the React component
  root.render(createElement(StudentClassCreditsComponent, props));
});
