import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";
import path from "node:path";
import { fileURLToPath } from "url";

// Root ESLint config that applies to all TypeScript files in the repo.
// It mirrors the NestJS config but sets tsconfigRootDir to the repository root
// so type-aware rules work across packages.
export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "**/node_modules/**",
      "dist",
      "build",
      "vendor",
      "wordpress/build",
      "wordpress/vendor",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: "module",
      parserOptions: {
        projectService: true,
        // Use repo root as tsconfig root so eslint finds tsconfigs in subpackages
        tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
    },
  },
  {
    files: ["eslint.config.mjs"],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
  },
);
