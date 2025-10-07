import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import StudentPackageDetails from "./StudentPackageDetails";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("student-package-details-root");
  if (!container) return;

  const root = createRoot(container);

  const viewMode = (container.getAttribute("data-view-mode") || "detailed") as
    | "compact"
    | "detailed";
  const showExpired = container.getAttribute("data-show-expired") === "1";

  const props = {
    viewMode,
    showExpired,
  };

  root.render(createElement(StudentPackageDetails, props));
});
