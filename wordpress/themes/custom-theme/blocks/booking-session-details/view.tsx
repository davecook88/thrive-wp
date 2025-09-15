import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import BookingSessionDetailsComponent from "./BookingSessionDetailsComponent";

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("booking-session-details-root");
  if (!container) return;
  const root = createRoot(container);

  // Read attributes from data attributes
  const heading = container.getAttribute("data-heading") || "Session Details";
  const showTeacherName =
    container.getAttribute("data-show-teacher-name") === "true";
  const showDateTime = container.getAttribute("data-show-date-time") === "true";
  const dateTimeFormat =
    container.getAttribute("data-date-time-format") || "F j, Y g:i A T";
  const errorMessage =
    container.getAttribute("data-error-message") ||
    "Please ensure you have valid booking details in your URL.";

  const attributes = {
    heading,
    showTeacherName,
    showDateTime,
    dateTimeFormat,
    errorMessage,
  };

  // Render the React component
  root.render(createElement(BookingSessionDetailsComponent, { attributes }));
});
