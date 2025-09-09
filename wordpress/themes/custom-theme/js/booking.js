/* global Stripe */
(function () {
  function qs(sel) {
    return document.querySelector(sel);
  }

  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  async function getClientSecret() {
    // Call WordPress -> NestJS bridge to create a PaymentIntent for this booking
    // Endpoint is expected to validate session and booking details server-side
    const res = await fetch("/api/booking/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        start: getQueryParam("start"),
        end: getQueryParam("end"),
        teacher: getQueryParam("teacher"),
      }),
    });
    if (!res.ok) {
      throw new Error("Failed to initialize payment.");
    }
    const data = await res.json();
    if (!data?.clientSecret || !data?.publishableKey) {
      throw new Error("Invalid payment response.");
    }
    return data;
  }

  async function init() {
    console.log("Init booking payment");
    const loader = qs("#thrive-payment-loader");
    const messages = qs("#payment-messages");
    const payBtn = qs("#thrive-pay-button");
    const paymentElContainer = qs("#payment-element");
    if (!paymentElContainer || !payBtn) return;

    try {
      const { clientSecret, publishableKey } = await getClientSecret();
      const stripe = Stripe(publishableKey, { apiVersion: "2022-11-15" });
      const elements = stripe.elements({ clientSecret });
      const paymentElement = elements.create("payment");
      await paymentElement.mount(paymentElContainer);
      if (loader) loader.style.display = "none";

      payBtn.addEventListener("click", async () => {
        payBtn.disabled = true;
        messages.style.display = "none";
        messages.textContent = "";
        const result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.origin + "/booking/complete",
          },
        });
        if (result.error) {
          messages.textContent = result.error.message || "Payment failed";
          messages.style.display = "block";
          payBtn.disabled = false;
        }
      });
    } catch (err) {
      if (loader)
        loader.textContent =
          (err && err.message) || "Unable to load payment form.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
