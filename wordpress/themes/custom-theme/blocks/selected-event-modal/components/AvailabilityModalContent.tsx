import { createElement } from "@wordpress/element";

export default function AvailabilityModalContent({ event }: { event: any }) {
  return (
    <div className="selected-event-modal__availability">
      <h3>{event?.title || "Availability"}</h3>
      <p>
        <strong>Window:</strong> {event?.startLocal} - {event?.endLocal}
      </p>
      <p>{event?.note || event?.description}</p>
      <div>
        <button className="button">Request booking</button>
      </div>
    </div>
  );
}
