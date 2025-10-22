import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";

import PackageSelection from "./components/PackageSelection";

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("package-selection-root");
  if (!container) return;
  const root = createRoot(container);

  // Read attributes from data attributes
  const showCredits = container.getAttribute("data-show-credits") === "1";
  const showExpiry = container.getAttribute("data-show-expiry") === "1";
  const loadingMessage =
    container.getAttribute("data-loading-message") ||
    "Loading available packages...";
  const errorMessage =
    container.getAttribute("data-error-message") ||
    "Unable to load packages at this time. Please refresh and try again.";
  const noPackagesMessage =
    container.getAttribute("data-no-packages-message") ||
    "No packages are currently available.";
  const initialPackageId =
    container.getAttribute("data-initial-package-id") || undefined;
  const initialPriceId =
    container.getAttribute("data-initial-price-id") || undefined;
  const sessionId = container.getAttribute("data-session-id") || undefined;

  // Render the React component
  root.render(
    createElement(PackageSelection, {
      showCredits,
      showExpiry,
      loadingMessage,
      errorMessage,
      noPackagesMessage,
      initialPackageId,
      initialPriceId,
      sessionId,
    }),
  );
});
