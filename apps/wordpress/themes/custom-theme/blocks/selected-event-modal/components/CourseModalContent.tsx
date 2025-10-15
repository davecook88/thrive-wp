import { createElement } from "@wordpress/element";

export default function CourseModalContent({ event }: { event: any }) {
  return (
    <div className="selected-event-modal__course">
      <h3>{event?.title || event?.name || "Course"}</h3>
      <p>
        <strong>Starts:</strong> {event?.startLocal}
      </p>
      <p>{event?.summary || event?.description}</p>
      <div>
        <a href={event?.courseUrl || "#"} className="button">
          View course
        </a>
      </div>
    </div>
  );
}
