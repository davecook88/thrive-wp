declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    any
  >;
  export default component;
}

export {};

declare global {
  interface Window {
    thriveAdminBridgeAjax?: {
      ajax_url: string;
      nonce: string;
      admin_url: string;
      is_dev: boolean;
    };
    // Minimal jQuery presence used only for WP admin-ready event
    jQuery?: any;
  }
}
