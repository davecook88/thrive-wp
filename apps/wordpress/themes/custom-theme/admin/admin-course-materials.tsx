import React from "react";
import { createRoot } from "react-dom/client";
import CourseMaterialsBuilder from "./CourseMaterialsBuilder";

const mountCourseMaterialsBuilder = () => {
  console.log("Mounting Course Materials Builder");
  const container = document.getElementById("course-materials-builder-root");
  console.log("Container found:", container);
  if (container) {
    const root = createRoot(container);
    root.render(<CourseMaterialsBuilder />);
    console.log("Course Materials Builder mounted successfully");
  } else {
    console.error("course-materials-builder-root container not found");
  }
};

// Mount on DOMContentLoaded if page is still loading
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountCourseMaterialsBuilder);
} else {
  // DOM already loaded, mount immediately
  mountCourseMaterialsBuilder();
}
