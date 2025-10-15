/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.e2e.spec.ts"],
    exclude: ["node_modules", "dist", "build"],
    globals: true,
    setupFiles: [
      "test/env.setup.ts",
      "test/guard.setup.ts",
      "test/db-safety.setup.ts",
      "test/setup.ts",
    ],
    testTimeout: 30000,
    coverage: {
      include: ["src/**/*.(t|j)s"],
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "coverage",
    },
    deps: {
      inline: ["@nestjs/testing", "@nestjs/common", "@nestjs/core"],
    },
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});
