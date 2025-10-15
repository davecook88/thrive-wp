import defaultConfig from "@wordpress/scripts/config/webpack.config.js";
import { resolve as __resolve, dirname } from "path";
import { fileURLToPath } from "url";

// @ts-expect-error import.meta is not recognized in .js files by TypeScript
const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  ...defaultConfig,
  resolve: {
    ...defaultConfig.resolve,
    alias: {
      ...defaultConfig.resolve.alias,
      // Map WordPress-specific shared imports to the local WordPress shared folder
      // These MUST come BEFORE the general @thrive/shared alias to take precedence
      "@thrive/shared/calendar": __resolve(
        __dirname,
        "../../shared/calendar.ts",
      ),
      "@thrive/shared/thrive": __resolve(__dirname, "../../shared/thrive.ts"),
      "@thrive/shared/clients/thrive": __resolve(
        __dirname,
        "../../shared/thrive.ts",
      ),
      "@thrive/shared/types/calendar-utils": __resolve(
        __dirname,
        "../../shared/calendar.ts",
      ),
      // For all other @thrive/shared imports (types), use the monorepo package
      "@thrive/shared": __resolve(
        __dirname,
        "../../../../packages/shared/dist",
      ),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
};
