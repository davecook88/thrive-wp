import React from "react";
import { createRoot } from "@wordpress/element";
import { Notifications } from "../../components";

document.addEventListener("DOMContentLoaded", () => {
  const rootEl = document.getElementById("thrive-notifications-root");
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<Notifications />);
  }
});
