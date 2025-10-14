import {
  createElement,
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "@wordpress/element";
import { createRoot } from "react-dom/client";
import { Modal, Button } from "@wordpress/components";
import ClassModalContent from "./components/ClassModalContent";
import AvailabilityModalContent from "./components/AvailabilityModalContent";
import CourseModalContent from "./components/CourseModalContent";
import DefaultModalContent from "./components/DefaultModalContent";

type EventDetail = {
  event?: any;
  contextId?: string;
};

type ModalType = "availability" | "class" | "course" | "default" | string;

function SelectedEventModalContent({
  event,
  modalType,
}: {
  event: any;
  modalType: ModalType;
}) {
  const [loading, setLoading] = useState<boolean>(true);

  // Precompute friendly local time strings once per event
  const derived = useMemo(() => {
    const start = event?.startUtc ? new Date(event.startUtc) : undefined;
    const end = event?.endUtc ? new Date(event.endUtc) : undefined;
    const startLocal = start
      ? start.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";
    const endLocal = end
      ? end.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";
    return { startLocal, endLocal };
  }, [event?.startUtc, event?.endUtc]);

  useEffect(() => {
    // small UX delay to avoid flash when opening modal very quickly
    let tid = setTimeout(() => setLoading(false), 50);
    return () => clearTimeout(tid);
  }, [event, modalType]);

  if (loading) return <div>Loading…</div>;

  const props = { event: { ...event, ...derived } };

  switch ((modalType || "").toString().toLowerCase()) {
    case "class":
      return <ClassModalContent {...props} />;
    case "availability":
      return <AvailabilityModalContent {...props} />;
    case "course":
      return <CourseModalContent {...props} />;
    default:
      return <DefaultModalContent {...props} />;
  }
}

function ModalPortal({
  title,
  event,
  modalType,
  onClose,
}: {
  title?: string;
  event: any;
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

function mountModal(event: any, modalType: ModalType, title?: string) {
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
function pickModalType(event: any): ModalType {
  const t = (event?.type || event?.kind || "").toString().toLowerCase();
  if (t === "availability" || t === "class" || t === "course") return t;
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
    async (e: Event) => {
      const detail = (e as CustomEvent<EventDetail>).detail;
      const event = detail?.event;
      if (!event) return;

      const modalType = pickModalType(event);
      const title = event?.title || event?.name || undefined;
      mountModal(event, modalType, title);
    },
    false,
  );
});
