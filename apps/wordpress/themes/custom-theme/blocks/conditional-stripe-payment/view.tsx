import { createElement } from "@wordpress/element";
import { createRoot } from "react-dom/client";
import ConditionalStripePaymentComponent from "./ConditionalStripePaymentComponent";

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("conditional-stripe-payment-root");
  if (!container) return;
  const root = createRoot(container);

  // Read attributes from data attributes
  const heading =
    container.getAttribute("data-heading") || "Complete Your Payment";
  const selectPackageMessage =
    container.getAttribute("data-select-package-message") ||
    "Please select a package above to continue with payment.";
  const confirmButtonText =
    container.getAttribute("data-confirm-button-text") || "Confirm and Pay";
  const cancelButtonText =
    container.getAttribute("data-cancel-button-text") || "Cancel";
  const loadingText =
    container.getAttribute("data-loading-text") ||
    "Preparing secure payment...";
  const showBackLink = container.getAttribute("data-show-back-link") === "true";
  const backLinkUrl =
    container.getAttribute("data-back-link-url") || "/booking";
  const backLinkText =
    container.getAttribute("data-back-link-text") || "Back to Calendar";

  // Read context data
  const context = {
    "custom-theme/bookingStart":
      container.getAttribute("data-booking-start") || undefined,
    "custom-theme/bookingEnd":
      container.getAttribute("data-booking-end") || undefined,
    "custom-theme/teacherId":
      container.getAttribute("data-teacher") || undefined,
    "custom-theme/selectedPackageId":
      container.getAttribute("data-initial-package-id") || undefined,
    "custom-theme/selectedPriceId":
      container.getAttribute("data-initial-price-id") || undefined,
    "custom-theme/selectedPackageName":
      container.getAttribute("data-initial-package-name") || undefined,
  };

  const attributes = {
    heading,
    selectPackageMessage,
    confirmButtonText,
    cancelButtonText,
    loadingText,
    showBackLink,
    backLinkUrl,
    backLinkText,
  };

  // Render the React component
  root.render(
    createElement(ConditionalStripePaymentComponent, { attributes, context })
  );
});
