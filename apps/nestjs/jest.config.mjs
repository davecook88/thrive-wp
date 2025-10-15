/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: ["**/*.spec.ts", "**/*.e2e.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json", "mjs"],
  extensionsToTreatAsEsm: [".ts"],
  collectCoverageFrom: ["src/**/*.(t|j)s"],
  coverageDirectory: "coverage",
  // Run env + safety guard BEFORE any test framework setup or module imports
  setupFiles: ["<rootDir>/test/env.setup.ts", "<rootDir>/test/guard.setup.ts"],
  setupFilesAfterEnv: [
    "<rootDir>/test/db-safety.setup.ts",
    "<rootDir>/test/setup.ts",
  ],
  testEnvironmentOptions: {
    NODE_ENV: "test",
  },
  testTimeout: 30000, // Increase timeout for database tests
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.spec.json",
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(bcryptjs|jsonwebtoken|passport|passport-jwt|passport-google-oauth20|passport-local|@nestjs|@jest/globals)/)",
  ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)\\.js$": "<rootDir>/src/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
