import { createElement, Fragment, useState } from "@wordpress/element";
import { render, unmountComponentAtNode } from "@wordpress/element";
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
    onClose();
  };
  return (
    <Fragment>
      {isOpen && (
        <Modal title={title || "Event"} onRequestClose={close} shouldCloseOnEsc>
          <div dangerouslySetInnerHTML={{ __html: html }} />
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

async function fetchModalContent(postId: number): Promise<string | null> {
  if (!postId) return null;
  try {
    const res = await fetch(`/wp-json/wp/v2/thrive_modal/${postId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.content?.rendered || null;
  } catch {
    return null;
  }
}

function mountModal(html: string, title?: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const cleanup = () => {
    unmountComponentAtNode(container);
    container.remove();
  };
  render(
    createElement(ModalPortal, { html, title, onClose: cleanup }),
    container
  );
}

function pickModalId(wrapper: HTMLElement, event: any): number {
  const type = event?.type || event?.kind || "";
  const classId = Number(wrapper.getAttribute("data-class-modal-id") || 0);
  const courseId = Number(wrapper.getAttribute("data-course-modal-id") || 0);
  const defaultId = Number(wrapper.getAttribute("data-default-modal-id") || 0);
  if (String(type).toUpperCase() === "CLASS" && classId) return classId;
  if (String(type).toUpperCase() === "COURSE" && courseId) return courseId;
  return defaultId || classId || courseId || 0;
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

      const raw = await fetchModalContent(modalId);
      if (!raw) return;

      // Interpolate placeholders using event fields
      const html = interpolate(raw, { event });
      const title = event?.title || event?.name || undefined;
      mountModal(html, title);
    },
    false
  );
});
