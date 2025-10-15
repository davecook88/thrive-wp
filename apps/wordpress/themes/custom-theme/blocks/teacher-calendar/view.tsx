import { createRoot } from "react-dom/client";
import TeacherCalendar from "./components/TeacherCalendar";

document.addEventListener("DOMContentLoaded", () => {
  const containers = document.querySelectorAll<HTMLElement>(
    ".wp-block-custom-theme-teacher-calendar"
  );

  containers.forEach((container) => {
    const root = createRoot(container);

    // Read attributes from data attributes
    const view = (container.dataset.view || "week") as "week" | "day" | "month";
    const slotDuration = parseInt(container.dataset.slotDuration || "30", 10);
    const snapTo = parseInt(container.dataset.snapTo || "15", 10);
    const viewHeight = parseInt(container.dataset.viewHeight || "600", 10);

    root.render(
      <TeacherCalendar
        view={view}
        slotDuration={slotDuration}
        snapTo={snapTo}
        viewHeight={viewHeight}
      />
    );
  });
});
