/**
 * Thrive Login Modal Script
 * Handles opening, closing, focus trapping, and Google login for the login modal.
 * @module login-modal
 */
(function () {
  /**
   * Shorthand for querySelector.
   * @param {string} sel - CSS selector.
   * @param {Document|Element} [ctx=document] - Context to search within.
   * @returns {Element|null}
   */
  const qs = (sel, ctx = document) => ctx.querySelector(sel);

  /**
   * Shorthand for querySelectorAll, returns array.
   * @param {string} sel - CSS selector.
   * @param {Document|Element} [ctx=document] - Context to search within.
   * @returns {Element[]}
   */
  const qa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /**
   * Traps keyboard focus within the modal dialog.
   * @param {Element} modal - The modal element to trap focus inside.
   * @returns {void}
   */
  function trapFocus(modal) {
    const focusable = qa(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      modal
    ).filter((el) => !el.hasAttribute("disabled"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    /**
     * Handles keyboard navigation for focus trapping.
     * @param {KeyboardEvent} e
     */
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

  /**
   * Opens the login modal and traps focus.
   * @returns {void}
   */
  function open() {
    const modal = qs("#thrive-login-modal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.body.classList.add("thrive-modal-open");
    trapFocus(modal);
  }

  /**
   * Closes the login modal and returns focus to the trigger.
   * @returns {void}
   */
  function close() {
    const modal = qs("#thrive-login-modal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
    document.body.classList.remove("thrive-modal-open");
    const trigger = qs("#thrive-login-button");
    if (trigger) trigger.focus();
  }

  /**
   * Initializes modal event listeners and Google login.
   * @returns {void}
   */
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
    /**
     * Handles Google login button click.
     */
    const googleBtn = qs("#thrive-google-login");
    if (googleBtn) {
      googleBtn.addEventListener("click", () => {
        /**
         * @type {{googleAuthUrl?: string}}
         */
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
