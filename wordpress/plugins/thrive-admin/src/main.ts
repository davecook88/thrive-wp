import { createApp } from "vue";
import "./style.css";

import Dashboard from "./components/Dashboard.vue";
import Users from "./components/Users.vue";
import Settings from "./components/Settings.vue";

// The data-* attributes come in as strings; we keep them generic to avoid over-assumptions.
function createVueIsland<TProps extends Record<string, unknown>>(
  selector: string,
  component: any
) {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  elements.forEach((element) => {
    const props = { ...(element.dataset as unknown as TProps) };
    const app = createApp(component as any, props);
    app.mount(element);
  });
}

const init = () => {
  createVueIsland('[data-vue-component="dashboard"]', Dashboard);
  createVueIsland('[data-vue-component="users"]', Users);
  createVueIsland('[data-vue-component="settings"]', Settings);
};

document.addEventListener("DOMContentLoaded", init);

if (window.jQuery) {
  window.jQuery(document).on("ready", init);
}
