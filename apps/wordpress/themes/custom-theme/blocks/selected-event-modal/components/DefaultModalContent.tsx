import { createElement } from "@wordpress/element";

export default function DefaultModalContent({ event }: { event: any }) {
  return (
    <div className="selected-event-modal__default">
      <h3>{event?.title || event?.name || "Event"}</h3>
      <p>
        {event?.startLocal && (
          <span>
            <strong>When:</strong> {event.startLocal}
            {event?.endLocal ? ` - ${event.endLocal}` : null}
          </span>
        )}
      </p>
      <p>{event?.description}</p>
    </div>
  );
}
