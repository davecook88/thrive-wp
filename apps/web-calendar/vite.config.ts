import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: "src/thrive-calendar.ts",
      name: "ThriveCalendar",
      formats: ["es"],
      fileName: () => "thrive-calendar.js",
    },
    rollupOptions: {
      output: {
        // Keep it single-file and self-contained
        manualChunks: undefined,
      },
    },
  },
});
