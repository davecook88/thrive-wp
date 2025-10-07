import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import StudentUpcomingSessions from "./StudentUpcomingSessions";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("student-upcoming-sessions-root");
  if (!container) return;

  const root = createRoot(container);

  const limit = parseInt(container.getAttribute("data-limit") || "5", 10);
  const showMeetingLinks = container.getAttribute("data-show-meeting-links") === "1";

  const props = {
    limit,
    showMeetingLinks,
  };

  root.render(createElement(StudentUpcomingSessions, props));
});
