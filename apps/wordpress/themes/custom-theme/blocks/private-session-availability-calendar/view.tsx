import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import PrivateSessionAvailabilityCalendar from "./components/PrivateSessionAvailabilityCalendar";

const ELEMENT_CLASS = ".private-session-availability-calendar-block";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll<HTMLElement>(ELEMENT_CLASS).forEach((container) => {
    if (!container) return;
    if ((container as any)._reactRoot) return;

    const root = createRoot(container);
    (container as any)._reactRoot = root;

    const view =
      (container.getAttribute("data-view") as
        | "week"
        | "day"
        | "month"
        | "list") || "week";
    const slotDuration = parseInt(
      container.getAttribute("data-slot-duration") || "30"
    );
    const snapTo = parseInt(container.getAttribute("data-snap-to") || "15");
    const viewHeight = parseInt(
      container.getAttribute("data-view-height") || "600"
    );
    const heading =
      container.getAttribute("data-heading") || "Book a Private Session";
    const showFilters =
      (container.getAttribute("data-show-filters") || "true") === "true";

    root.render(
      createElement(PrivateSessionAvailabilityCalendar, {
        view,
        slotDuration,
        snapTo,
        viewHeight,
        heading,
        showFilters,
      })
    );
  });
});
