import React from "react";
import { createRoot } from "react-dom/client";
import CourseMaterialsBuilder from "./CourseMaterialsBuilder";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Course Materials Builder script loaded");
  const container = document.getElementById("course-materials-builder-root");
  console.log("Container found:", container);
  if (container) {
    const root = createRoot(container);
    root.render(<CourseMaterialsBuilder />);
  }
});
