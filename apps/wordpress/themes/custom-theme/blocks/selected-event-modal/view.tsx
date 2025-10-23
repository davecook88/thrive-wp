import {
  createElement,
  Fragment,
  useEffect,
  useState,
} from "@wordpress/element";
import { createRoot } from "react-dom/client";
import { Modal, Button } from "@wordpress/components";
import ClassModalContent from "./components/ClassModalContent";
import AvailabilityModalContent from "./components/AvailabilityModalContent";
import CourseModalContent from "./components/CourseModalContent";
import DefaultModalContent from "./components/DefaultModalContent";
import {
  CalendarEvent,
  EventType,
  isAvailabilityEvent,
  isClassEvent,
  isCourseClassEvent,
} from "@thrive/shared";

type EventDetail = {
  event?: CalendarEvent;
  contextId?: string;
};

type ModalType = "availability" | "class" | "course" | "default";

function SelectedEventModalContent({
  event,
  modalType,
}: {
  event: CalendarEvent;
  modalType: ModalType;
}) {
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // small UX delay to avoid flash when opening modal very quickly
    const tid = setTimeout(() => setLoading(false), 50);
    return () => clearTimeout(tid);
  }, [event, modalType]);

  if (loading) return <div>Loading…</div>;

  const props = { event: { ...event } };

  if (isAvailabilityEvent(event)) {
    return <AvailabilityModalContent event={event} />;
  } else if (isClassEvent(event)) {
    return <ClassModalContent event={event} />;
  } else if (isCourseClassEvent(event)) {
    return <CourseModalContent event={event} />;
  }
  return <DefaultModalContent {...props} />;
}

function ModalPortal({
  title,
  event,
  modalType,
  onClose,
}: {
  title?: string;
  event: CalendarEvent;
  modalType: ModalType;
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const close = () => {
    setIsOpen(false);
  };
  // Defer cleanup until after React commits the close state to avoid sync unmount during render
  useEffect(() => {
    if (!isOpen) {
      const tid = setTimeout(() => onClose(), 0);
      return () => clearTimeout(tid);
    }
  }, [isOpen, onClose]);
  return (
    <Fragment>
      <div id="selected-event-modal"></div>
      {isOpen && (
        <Modal
          className="thrive-modal"
          title={title || "Event"}
          onRequestClose={close}
          shouldCloseOnEsc
          __experimentalHideHeader={true}
          bodyOpenClassName="selected-event-modal--open"
          size="fill"
        >
          <Button
            onClick={close}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 1,
              background: "transparent",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#000",
            }}
          >
            ×
          </Button>
          <SelectedEventModalContent event={event} modalType={modalType} />
        </Modal>
      )}
    </Fragment>
  );
}

function mountModal(
  event: CalendarEvent,
  modalType: ModalType,
  title?: string,
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const cleanup = () => {
    try {
      root.unmount();
    } finally {
      container.remove();
    }
  };
  root.render(
    createElement(ModalPortal, { event, modalType, title, onClose: cleanup }),
  );
}

// Determine the modal type based on event payload
function pickModalType(event: CalendarEvent | undefined): ModalType {
  const t = event?.type;
  const eventTypes: EventType[] = ["availability", "class"];
  if (t && eventTypes.includes(t)) return t as ModalType;
  return "default";
}

document.addEventListener("DOMContentLoaded", () => {
  const wrappers = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".wp-block-custom-theme-selected-event-modal",
    ),
  );
  if (!wrappers.length) return;

  document.addEventListener(
    "thrive-calendar:selectedEvent",
    (e: Event) => {
      const detail = (e as CustomEvent<EventDetail>).detail;
      const event: CalendarEvent | undefined = detail?.event;
      if (!event) {
        return;
      }
      const modalType = pickModalType(event);

      // Safely derive a title string if available
      let title: string | undefined;
      if (
        typeof (event as { title?: unknown }).title === "string" &&
        (event as { title?: string }).title!.trim() !== ""
      ) {
        title = (event as { title?: string }).title;
      } else if (
        "name" in event &&
        typeof (event as { name?: unknown }).name === "string" &&
        (event as { name?: string }).name!.trim() !== ""
      ) {
        title = (event as { name?: string }).name;
      } else {
        title = undefined;
      }

      mountModal(event, modalType, title);
    },
    false,
  );
});
