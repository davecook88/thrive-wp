const path = require("path");

/**
 * Simple webpack override to add an alias for @shared -> ../../shared
 * This avoids depending on tsconfig-paths-webpack-plugin which may have
 * ESM/CJS incompatibilities with the environment used by @wordpress/scripts.
 */
const applyAlias = (config) => {
  config.resolve = config.resolve || {};
  config.resolve.alias = Object.assign({}, config.resolve.alias, {
    "@shared": path.resolve(__dirname, "../../shared"),
  });
  return config;
};

module.exports = (config) => {
  // Merge alias into existing resolve config without replacing the full config
  config.resolve = config.resolve || {};
  config.resolve.alias = Object.assign({}, config.resolve.alias, {
    "@shared": path.resolve(__dirname, "../../shared"),
  });
  return config;
};
