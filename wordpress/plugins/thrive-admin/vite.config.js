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
        main: "./main.ts",
        dashboard: "./components/Dashboard.vue",
        users: "./components/Users.vue",
        settings: "./components/Settings.vue",
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
    // Bind to all interfaces so Docker containers can reach the dev server
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: {
      // Use localhost for browser access; server listens on 0.0.0.0
      host: "localhost",
      port: 5173,
      protocol: "ws",
      clientPort: 5173,
    },
    // Allow access from Docker containers using this hostname
    allowedHosts: ["host.docker.internal"],
  },
});
