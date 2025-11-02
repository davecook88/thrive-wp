import { createRoot } from "react-dom/client";
import SessionSelectionWizard from "./components/SessionSelectionWizard";

document.addEventListener("DOMContentLoaded", () => {
  const blocks = document.querySelectorAll(".session-selection-wizard-block");

  blocks.forEach((block) => {
    const stripeSessionId = block.getAttribute("data-stripe-session-id") || "";

    if (stripeSessionId && block instanceof HTMLElement) {
      const root = createRoot(block);
      root.render(<SessionSelectionWizard stripeSessionId={stripeSessionId} />);
    }
  });
});
