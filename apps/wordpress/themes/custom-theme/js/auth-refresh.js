/**
 * Thrive Authentication Token Refresh
 *
 * Automatically refreshes JWT access tokens before they expire
 * to maintain seamless user sessions.
 */

(function () {
  "use strict";

  // Configuration
  const CONFIG = {
    refreshEndpoint: "/auth/refresh",
    checkInterval: 5 * 60 * 1000, // Check every 5 minutes
    refreshThreshold: 10 * 60 * 1000, // Refresh if token expires within 10 minutes
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  };

  let refreshTimer = null;
  let isRefreshing = false;

  /**
   * Check if user is authenticated by looking for session cookie
   */
  function isAuthenticated() {
    return document.cookie.includes("thrive_sess=");
  }

  /**
   * Extract token expiration from JWT (without full decode for security)
   */
  function getTokenExpiration() {
    const cookies = document.cookie.split(";");
    let token = null;

    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith("thrive_sess=")) {
        token = cookie.substring("thrive_sess=".length);
        break;
      }
    }

    if (!token) return null;

    try {
      // Extract payload from JWT (second part)
      const payload = token.split(".")[1];
      if (!payload) return null;

      // Decode base64 payload
      const decoded = JSON.parse(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
      );

      // Return expiration time (in seconds, convert to milliseconds)
      return decoded.exp ? decoded.exp * 1000 : null;
    } catch (e) {
      console.warn("Failed to parse JWT token:", e);
      return null;
    }
  }

  /**
   * Refresh the access token
   */
  async function refreshToken(retryCount = 0) {
    if (isRefreshing) {
      console.log("Token refresh already in progress");
      return;
    }

    isRefreshing = true;

    try {
      console.log("Refreshing access token...");

      const response = await fetch(CONFIG.refreshEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (response.ok) {
        console.log("Token refreshed successfully");
        // Reset timer with new token expiration
        scheduleNextRefresh();
      } else if (response.status === 401) {
        console.log(
          "Refresh token expired or invalid, user needs to re-authenticate"
        );
        stopRefreshTimer();
        // Optionally redirect to login or show message
        handleAuthFailure();
      } else {
        throw new Error(`Refresh failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error("Token refresh failed:", error);

      if (retryCount < CONFIG.maxRetries) {
        console.log(`Retrying refresh in ${CONFIG.retryDelay}ms...`);
        setTimeout(() => refreshToken(retryCount + 1), CONFIG.retryDelay);
      } else {
        console.error("Max retries exceeded, stopping refresh attempts");
        stopRefreshTimer();
        handleAuthFailure();
      }
    } finally {
      isRefreshing = false;
    }
  }

  /**
   * Handle authentication failure
   */
  function handleAuthFailure() {
    // Clear any existing auth state
    // Optionally show a message or redirect
    console.log("Authentication failed - user may need to log in again");

    // You could dispatch a custom event for other scripts to handle
    window.dispatchEvent(new CustomEvent("thrive:auth:expired"));
  }

  /**
   * Schedule the next token refresh check
   */
  function scheduleNextRefresh() {
    stopRefreshTimer();

    const expiration = getTokenExpiration();
    if (!expiration) {
      console.warn("Could not determine token expiration");
      return;
    }

    const now = Date.now();
    const timeUntilExpiration = expiration - now;

    if (timeUntilExpiration <= 0) {
      // Token already expired, refresh immediately
      console.log("Token already expired, refreshing immediately");
      refreshToken();
      return;
    }

    const timeUntilRefresh = Math.max(
      timeUntilExpiration - CONFIG.refreshThreshold,
      1000 // Minimum 1 second delay
    );

    console.log(
      `Next token refresh in ${Math.round(timeUntilRefresh / 1000)} seconds`
    );

    refreshTimer = setTimeout(() => {
      refreshToken();
    }, timeUntilRefresh);
  }

  /**
   * Stop the refresh timer
   */
  function stopRefreshTimer() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  /**
   * Initialize the token refresh system
   */
  function init() {
    if (!isAuthenticated()) {
      console.log("User not authenticated, skipping token refresh setup");
      return;
    }

    console.log("Initializing token refresh system");
    scheduleNextRefresh();

    // Listen for page visibility changes to potentially refresh when user returns
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && isAuthenticated()) {
        const expiration = getTokenExpiration();
        if (expiration && expiration - Date.now() < CONFIG.refreshThreshold) {
          console.log(
            "Token expires soon after page became visible, refreshing"
          );
          refreshToken();
        }
      }
    });

    // Listen for custom auth events
    window.addEventListener("thrive:auth:login", () => {
      console.log("Login detected, starting token refresh");
      scheduleNextRefresh();
    });

    window.addEventListener("thrive:auth:logout", () => {
      console.log("Logout detected, stopping token refresh");
      stopRefreshTimer();
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose public API for manual control
  // @ts-expect-error ThriveAuth is added to window for external API access
  window.ThriveAuth = {
    refresh: () => refreshToken(),
    stop: () => stopRefreshTimer(),
    isAuthenticated: () => isAuthenticated(),
    getTokenExpiration: () => getTokenExpiration(),
  };
})();
