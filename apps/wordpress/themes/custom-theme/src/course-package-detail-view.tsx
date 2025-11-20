import React from "react";
import { createRoot } from "react-dom/client";
import CoursePackageDetail from "./components/CoursePackageDetail";
import "./components/course-package-detail.css";

document.addEventListener("DOMContentLoaded", () => {
  const mountPoint = document.getElementById("course-package-detail-mount");

  if (mountPoint) {
    const packageId = mountPoint.getAttribute("data-package-id");
    if (packageId) {
      const root = createRoot(mountPoint);
      root.render(<CoursePackageDetail packageId={packageId} />);
    }
  }
});
