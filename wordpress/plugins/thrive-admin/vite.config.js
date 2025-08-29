import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import liveReload from "vite-plugin-live-reload";

export default defineConfig({
  plugins: [
    vue(),
    liveReload([
      __dirname + "/src/**/*",
      __dirname + "/includes/**/*.php",
      __dirname + "/templates/**/*.php",
    ]),
  ],
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    manifest: true, // Generate manifest.json for WordPress
    rollupOptions: {
      input: {
        main: "./src/main.ts",
        dashboard: "./src/components/Dashboard.vue",
        users: "./src/components/Users.vue",
        settings: "./src/components/Settings.vue",
      },
      output: {
        entryFileNames: "js/[name].js",
        chunkFileNames: "js/[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "css/[name][extname]";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    cors: true,
    hmr: {
      port: 5173,
    },
  },
});
