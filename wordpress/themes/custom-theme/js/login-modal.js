(function () {
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function trapFocus(modal) {
    const focusable = qa(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      modal
    ).filter((el) => !el.hasAttribute("disabled"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function handler(e) {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === "Escape") {
        close();
      }
    }
    modal.addEventListener("keydown", handler);
    first.focus();
  }

  function open() {
    const modal = qs("#thrive-login-modal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.body.classList.add("thrive-modal-open");
    trapFocus(modal);
  }

  function close() {
    const modal = qs("#thrive-login-modal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
    document.body.classList.remove("thrive-modal-open");
    const trigger = qs("#thrive-login-button");
    if (trigger) trigger.focus();
  }

  function init() {
    const trigger = qs("#thrive-login-button");
    const modal = qs("#thrive-login-modal");
    if (!trigger || !modal) return;

    trigger.addEventListener("click", open);
    qa("[data-close-modal]", modal).forEach((btn) =>
      btn.addEventListener("click", close)
    );
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    // Google Login
    const googleBtn = qs("#thrive-google-login");
    if (googleBtn) {
      googleBtn.addEventListener("click", () => {
        const cfg = window.ThriveAuthConfig || {};
        if (cfg.googleAuthUrl) {
          window.location.href = cfg.googleAuthUrl;
        } else {
          console.error("Google auth URL missing");
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
