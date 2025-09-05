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

type ModalType = "availability" | "class" | "course" | "default" | string;

function interpolate(html: string, data: Record<string, any>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const path = String(key).split(".");
    let v: any = data;
    for (const k of path) v = v?.[k];
    return v == null ? "" : String(v);
  });
}

function SelectedEventModalContent({
  event,
  modalType,
}: {
  event: any;
  modalType: ModalType;
}) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

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

      const html = await fetchModalContentByType(modalType);

      if (!cancelled) {
        const interpolated = html
          ? interpolate(html, {
              event: {
                ...event,
                startLocal,
                endLocal,
              },
            })
          : "";
        setContent(interpolated);
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [event, modalType]);

  if (loading) return <div>Loading…</div>;
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
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
        >
          <SelectedEventModalContent event={event} modalType={modalType} />
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

async function fetchModalContentByType(
  type: ModalType,
  payload?: any
): Promise<string | null> {
  if (!type) return null;
  try {
    const res = await fetch(
      `/wp-json/custom-theme/v1/modal/render?type=${encodeURIComponent(
        String(type)
      )}`,
      {
        method: "GET", // Always GET for caching
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
    createElement(ModalPortal, { event, modalType, title, onClose: cleanup })
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

      // Choose wrapper in the same calendar context if provided (kept for parity/future use)
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

      const modalType = pickModalType(event);
      const title = event?.title || event?.name || undefined;
      mountModal(event, modalType, title);
    },
    false
  );
});
