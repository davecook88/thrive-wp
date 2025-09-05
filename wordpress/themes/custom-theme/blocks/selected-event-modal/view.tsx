import {
  createElement,
  Fragment,
  useEffect,
  useState,
} from "@wordpress/element";
import { createRoot } from "react-dom/client";
import { Modal, Button } from "@wordpress/components";

type EventDetail = {
  event?: any;
  contextId?: string;
};

function interpolate(html: string, data: Record<string, any>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const path = String(key).split(".");
    let v: any = data;
    for (const k of path) v = v?.[k];
    return v == null ? "" : String(v);
  });
}

function ModalPortal({
  title,
  html,
  onClose,
}: {
  title?: string;
  html: string;
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
      {isOpen && (
        <Modal
          className="thrive-modal"
          title={title || "Event"}
          onRequestClose={close}
          shouldCloseOnEsc
        >
          <div
            className="thrive-modal-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </Fragment>
  );
}

async function fetchModalContent(
  postId: number,
  payload?: any
): Promise<string | null> {
  if (!postId) return null;
  try {
    const res = await fetch(
      `/wp-json/custom-theme/v1/modal/render?post_id=${encodeURIComponent(
        String(postId)
      )}`,
      {
        method: payload ? "POST" : "GET",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
        credentials: "same-origin",
      }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null as any);
    const html = data && typeof data.html === "string" ? data.html : null;
    return html;
  } catch {
    return null;
  }
}

function mountModal(html: string, title?: string) {
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
  root.render(createElement(ModalPortal, { html, title, onClose: cleanup }));
}

function pickModalId(wrapper: HTMLElement, event: any): number {
  const type = (event?.type || event?.kind || "").toString().toLowerCase();
  const availabilityId = Number(
    wrapper.getAttribute("data-availability-modal-id") || 0
  );
  const classId = Number(wrapper.getAttribute("data-class-modal-id") || 0);
  const courseId = Number(wrapper.getAttribute("data-course-modal-id") || 0);
  const defaultId = Number(wrapper.getAttribute("data-default-modal-id") || 0);
  if (type === "availability" && availabilityId) return availabilityId;
  if (type === "class" && classId) return classId;
  if (type === "course" && courseId) return courseId;
  return availabilityId || classId || courseId || defaultId || 0;
}

document.addEventListener("DOMContentLoaded", () => {
  const wrappers = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".wp-block-custom-theme-selected-event-modal"
    )
  );
  if (!wrappers.length) return;

  document.addEventListener(
    "thrive-calendar:selectedEvent",
    async (e: Event) => {
      const detail = (e as CustomEvent<EventDetail>).detail;
      const event = detail?.event;
      if (!event) return;

      // Choose wrapper in the same calendar context if provided
      let wrapper: HTMLElement | undefined = wrappers[0];
      if (detail?.contextId) {
        const inSameCtx = wrappers.find((w) => {
          const ctx = w.closest(
            ".wp-block-custom-theme-thrive-calendar-context"
          ) as HTMLElement | null;
          return ctx?.id === detail.contextId;
        });
        if (inSameCtx) wrapper = inSameCtx;
      }
      if (!wrapper) return;

      const modalId = pickModalId(wrapper, event);
      if (!modalId) return;

      // Prepare derived friendly local time strings for convenience in templates
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

      // Ask server to render the modal content so authors can rely on PHP/blocks
      const raw = await fetchModalContent(modalId, {
        event: {
          ...event,
          startLocal,
          endLocal,
        },
      });
      if (!raw) return;

      // Still allow client-side token replacement for simple placeholders
      const html = interpolate(raw, { event });
      const title = event?.title || event?.name || undefined;
      mountModal(html, title);
    },
    false
  );
});
