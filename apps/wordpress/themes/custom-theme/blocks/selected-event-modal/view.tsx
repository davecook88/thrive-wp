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
import CourseStepBookingModal from "./components/CourseStepBookingModal";
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

type CourseStepBookingDetail = {
  packageId: number;
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  isModifying: boolean;
};

type ModalType = "availability" | "class" | "course" | "courseStepBooking" | "default";

function SelectedEventModalContent({
  event,
  modalType,
  courseStepBooking,
  onClose,
}: {
  event?: CalendarEvent;
  modalType: ModalType;
  courseStepBooking?: CourseStepBookingDetail;
  onClose?: () => void;
}) {
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // small UX delay to avoid flash when opening modal very quickly
    const tid = setTimeout(() => setLoading(false), 50);
    return () => clearTimeout(tid);
  }, [event, modalType, courseStepBooking]);

  if (loading) return <div>Loading…</div>;

  if (modalType === "courseStepBooking" && courseStepBooking && onClose) {
    return (
      <CourseStepBookingModal
        packageId={courseStepBooking.packageId}
        stepId={courseStepBooking.stepId}
        stepLabel={courseStepBooking.stepLabel}
        stepTitle={courseStepBooking.stepTitle}
        isModifying={courseStepBooking.isModifying}
        onClose={onClose}
      />
    );
  }

  if (!event) return <DefaultModalContent event={event} />;

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
  courseStepBooking,
  onClose,
}: {
  title?: string;
  event?: CalendarEvent;
  modalType: ModalType;
  courseStepBooking?: CourseStepBookingDetail;
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
          title={
            modalType === "courseStepBooking"
              ? courseStepBooking?.stepLabel
              : title || "Event"
          }
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
          <SelectedEventModalContent
            event={event}
            modalType={modalType}
            courseStepBooking={courseStepBooking}
            onClose={close}
          />
        </Modal>
      )}
    </Fragment>
  );
}

function mountModal(
  event: CalendarEvent | undefined,
  modalType: ModalType,
  title?: string,
  courseStepBooking?: CourseStepBookingDetail,
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
    createElement(ModalPortal, {
      event,
      modalType,
      title,
      courseStepBooking,
      onClose: cleanup,
    }),
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

  // Handle regular calendar events
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

  // Handle course step booking from My Courses block
  document.addEventListener(
    "thrive-course:bookStep",
    (e: Event) => {
      const detail = (e as CustomEvent<CourseStepBookingDetail>).detail;
      if (!detail) {
        return;
      }
      mountModal(undefined, "courseStepBooking", undefined, detail);
    },
    false,
  );
});
