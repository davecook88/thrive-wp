import { createApp, type Component } from "vue";
import "./style.css";

import Dashboard from "./components/Dashboard.vue";
import Users from "./components/Users.vue";
import Settings from "./components/Settings.vue";
import PackagesAdmin from "./components/PackagesAdmin.vue";
import GroupClasses from "./components/GroupClasses.vue";

// The data-* attributes come in as strings; we keep them generic to avoid over-assumptions.
function createVueIsland<TProps extends Record<string, unknown>>(
  selector: string,
  component: Component,
) {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  elements.forEach((element) => {
    // Check if already mounted
    if (element.hasAttribute("data-vue-mounted")) {
      return;
    }
    const props = { ...(element.dataset as unknown as TProps) };
    const app = createApp(component, props);
    app.mount(element);
    element.setAttribute("data-vue-mounted", "true");
  });
}

const init = () => {
  createVueIsland('[data-vue-component="dashboard"]', Dashboard as Component);
  createVueIsland('[data-vue-component="users"]', Users as Component);
  createVueIsland('[data-vue-component="settings"]', Settings as Component);
  createVueIsland(
    '[data-vue-component="packages-admin"]',
    PackagesAdmin as Component,
  );
  createVueIsland(
    '[data-vue-component="group-classes"]',
    GroupClasses as Component,
  );
};

document.addEventListener("DOMContentLoaded", init);

if (window.jQuery) {
  (
    window as {
      jQuery: (doc: Document) => {
        on: (event: string, handler: () => void) => void;
      };
    }
  )
    .jQuery(document)
    .on("ready", init);
}
