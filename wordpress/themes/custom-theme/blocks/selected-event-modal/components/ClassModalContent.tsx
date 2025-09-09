import { createElement } from "@wordpress/element";

export default function ClassModalContent({ event }: { event: any }) {
  const teacher = event?.teacher ?? event?.instructor ?? null;
  return (
    <div className="selected-event-modal__class">
      <h3>{event?.title || event?.name || "Class"}</h3>
      <p>
        <strong>When:</strong> {event?.startLocal} - {event?.endLocal}
      </p>
      {teacher && (
        <p>
          <strong>Teacher:</strong> {teacher?.name || teacher}
        </p>
      )}
      <p>{event?.description}</p>
      <div>
        <a href={event?.joinUrl || "#"} className="button">
          Join class
        </a>
      </div>
    </div>
  );
}
