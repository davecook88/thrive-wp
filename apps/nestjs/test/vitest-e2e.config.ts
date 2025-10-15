/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.e2e.spec.ts"],
    exclude: ["node_modules", "dist", "build", "src/**/*.spec.ts"],
    globals: true,
    setupFiles: ["test/env.setup.ts", "test/setup.ts"],
    testTimeout: 30000,
    maxWorkers: 1,
    environmentOptions: {
      NODE_ENV: "test",
    },
  },
  esbuild: {
    target: "node18",
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});
