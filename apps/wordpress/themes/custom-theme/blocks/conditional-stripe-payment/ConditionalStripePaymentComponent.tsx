import { useEffect, useState } from "@wordpress/element";
import { z } from "zod";
import {
  StripeKeyResponseSchema,
  CreateSessionResponseSchema,
} from "@thrive/shared/types/payments";

interface ConditionalStripePaymentAttributes {
  heading: string;
  selectPackageMessage: string;
  confirmButtonText: string;
  cancelButtonText: string;
  loadingText: string;
  showBackLink: boolean;
  backLinkUrl: string;
  backLinkText: string;
}

interface ConditionalStripePaymentComponentProps {
  attributes: ConditionalStripePaymentAttributes;
  context?: {
    "custom-theme/bookingStart"?: string;
    "custom-theme/bookingEnd"?: string;
    "custom-theme/teacherId"?: string;
    "custom-theme/selectedPackageId"?: string;
    "custom-theme/selectedPriceId"?: string;
    "custom-theme/selectedPackageName"?: string;
  };
}

declare global {
  interface Window {
    Stripe: any;
  }
}

const ConditionalStripePaymentComponent: React.FC<
  ConditionalStripePaymentComponentProps
> = ({ attributes, context = {} }) => {
  const {
    selectPackageMessage,
    confirmButtonText,
    cancelButtonText,
    loadingText,
    showBackLink,
    backLinkUrl,
    backLinkText,
  } = attributes;

  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  // Get booking data from context or URL params
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("sessionId") || "";
  const serviceType = urlParams.get("serviceType") || "";
  const start =
    context["custom-theme/bookingStart"] || urlParams.get("start") || "";
  const end = context["custom-theme/bookingEnd"] || urlParams.get("end") || "";
  const teacher =
    context["custom-theme/teacherId"] || urlParams.get("teacher") || "";

  // Handle package selection
  useEffect(() => {
    const handlePackageSelected = async (event: any) => {
      const pkg = event.detail;
      setSelectedPackage(pkg);
      setMessage("");
      setIsLoading(true);

      try {
        // Initialize Stripe if not already done
        let stripeInstance = stripe;
        if (!stripeInstance) {
          const response = await fetch("/api/payments/stripe-key");
          const json = await response.json();
          const parsed = StripeKeyResponseSchema.safeParse(json);
          if (!parsed.success) {
            throw new Error("Invalid stripe key response");
          }
          const { publishableKey } = parsed.data;
          stripeInstance = window.Stripe(publishableKey);
          setStripe(stripeInstance);
        }

        // Create payment session
        const sessionResponse = await fetch("/api/payments/create-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceId: pkg.priceId,
            bookingData:
              sessionId && serviceType === "GROUP"
                ? {
                    // Group class booking - we already have the session
                    type: "group",
                    sessionId: Number(sessionId),
                    serviceType: "GROUP",
                  }
                : {
                    // Private session booking - we need to create a new session
                    type: "private",
                    teacherId: Number(teacher),
                    start,
                    end,
                    serviceType: "PRIVATE", // Default to PRIVATE for legacy URLs
                  },
          }),
        });

        if (!sessionResponse.ok) {
          throw new Error("Failed to create payment session");
        }

        const sessionJson = await sessionResponse.json();
        const sessionParsed =
          CreateSessionResponseSchema.safeParse(sessionJson);
        if (!sessionParsed.success) {
          throw new Error("Invalid session response");
        }
        const { clientSecret } = sessionParsed.data;

        // Create elements instance with clientSecret
        const elementsInstance = stripeInstance.elements({
          clientSecret: clientSecret,
        });
        setElements(elementsInstance);

        // Create payment element
        const paymentElementInstance = elementsInstance.create("payment", {
          layout: "tabs",
        });

        // Mount payment element after a short delay to ensure DOM is ready
        setTimeout(() => {
          const paymentElementDiv = document.getElementById("payment-element");
          if (paymentElementDiv) {
            paymentElementInstance.mount("#payment-element");
            paymentElementInstance.on("ready", () => {
              setIsLoading(false);
            });
          }
        }, 100);
      } catch (error) {
        console.error("Payment session error:", error);
        setMessage("Failed to initialize payment. Please try again.");
        setIsLoading(false);
      }
    };

    // Listen for package selection events
    document.addEventListener(
      "custom-theme:packageSelected",
      handlePackageSelected,
    );

    // Handle initial package from context
    const initialPkg = {
      id: context["custom-theme/selectedPackageId"],
      priceId: context["custom-theme/selectedPriceId"],
      name: context["custom-theme/selectedPackageName"],
    };

    if (initialPkg.id || initialPkg.priceId) {
      document.dispatchEvent(
        new CustomEvent("custom-theme:packageSelected", { detail: initialPkg }),
      );
    }

    return () => {
      document.removeEventListener(
        "custom-theme:packageSelected",
        handlePackageSelected,
      );
    };
  }, [stripe, start, end, teacher, context]);

  const handlePayment = async () => {
    if (!stripe || !elements) return;

    setIsLoading(true);
    setMessage("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: sessionId
          ? `${window.location.origin}/booking-success?sessionId=${encodeURIComponent(sessionId)}&serviceType=${encodeURIComponent(serviceType)}`
          : `${window.location.origin}/booking-success?session_start=${encodeURIComponent(start)}&session_end=${encodeURIComponent(end)}&teacher=${encodeURIComponent(teacher)}&serviceType=${encodeURIComponent("PRIVATE")}`,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
    }
  };

  if (!selectedPackage) {
    return (
      <div className="stripe-payment-container">
        <div id="no-package-selected" className="payment-state">
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              borderRadius: "12px",
              padding: "16px 18px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0 }}>{selectPackageMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stripe-payment-container">
      <div id="payment-form" className="payment-state">
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "16px",
          }}
        >
          <div
            id="selected-package-info"
            style={{
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontWeight: 600, color: "#0c4a6e" }}>
              Selected Package:
            </div>
            <div id="selected-package-name" style={{ color: "#0c4a6e" }}>
              {selectedPackage.name}
            </div>
          </div>

          <div id="payment-element">
            {/* Stripe Payment Element injects here */}
          </div>
          {message && (
            <div
              id="payment-messages"
              role="alert"
              style={{ marginTop: "10px", color: "#991b1b" }}
            >
              {message}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              marginTop: "14px",
            }}
          >
            <button
              id="thrive-pay-button"
              className="button button-primary"
              disabled={isLoading}
              onClick={handlePayment}
            >
              {isLoading ? "Processing..." : confirmButtonText}
            </button>
            {showBackLink && (
              <a href={backLinkUrl} className="button">
                {cancelButtonText}
              </a>
            )}
          </div>
        </div>
        {isLoading && (
          <p
            id="thrive-payment-loader"
            style={{ marginTop: "10px", color: "#6b7280" }}
          >
            {loadingText}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConditionalStripePaymentComponent;
