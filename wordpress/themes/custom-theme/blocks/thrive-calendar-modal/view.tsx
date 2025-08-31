import {
  createElement,
  Fragment,
  useEffect,
  useState,
} from "@wordpress/element";
import { render, unmountComponentAtNode } from "@wordpress/element";
import { Modal, Button } from "@wordpress/components";

// Minimal runtime: find any element that declares a data-open-modal-id attribute
// and attach a click listener that opens a WP Modal with the HTML content from
// a matching <template data-modal-id="..."> rendered by the block.

const openersSelector = "[data-open-modal-id]";
const templateSelector = "template[data-modal-id]";

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
        <Modal title={title || "Modal"} onRequestClose={close}>
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <div style={{ marginTop: "1rem" }}>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </Fragment>
  );
}

function mountModal(html: string, title?: string) {
  // Create a container appended to body and render modal into it
  const container = document.createElement("div");
  document.body.appendChild(container);
  const cleanup = () => {
    unmountComponentAtNode(container);
    container.remove();
  };
  render(
    createElement(ModalPortal, { title, html, onClose: cleanup }),
    container
  );
}

function getTemplateHtmlById(modalId: string): string | null {
  const tpl = document.querySelector<HTMLTemplateElement>(
    `template[data-modal-id="${CSS.escape(modalId)}"]`
  );
  if (!tpl) return null;
  // template.innerHTML is fine; its content is not live-dom until cloned
  // We prefer content over innerHTML for better compatibility
  return tpl.innerHTML;
}

function enhanceOpeners(root: ParentNode) {
  const openers = Array.from(
    root.querySelectorAll<HTMLElement>(openersSelector)
  );
  for (const el of openers) {
    if ((el as any).__thriveModalBound) continue;
    el.addEventListener("click", (e) => {
      const modalId = el.getAttribute("data-open-modal-id");
      if (!modalId) return;
      const html = getTemplateHtmlById(modalId);
      if (!html) return;
      const title = el.getAttribute("data-modal-title") || undefined;
      mountModal(html, title);
      e.preventDefault();
    });
    (el as any).__thriveModalBound = true;
  }
}

// Initial boot
document.addEventListener("DOMContentLoaded", () => {
  enhanceOpeners(document);
});

// Optional: observe for dynamically added openers
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type === "childList") {
      for (const node of Array.from(m.addedNodes)) {
        if (node instanceof HTMLElement || node instanceof DocumentFragment) {
          enhanceOpeners(node);
        }
      }
    }
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
