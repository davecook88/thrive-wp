// Load .env.test BEFORE ANY OTHER IMPORTS
import { config } from "dotenv";
import path from "node:path";
const currentDir = process.cwd();
console.log("[TEST SETUP] Current dir:", currentDir);
console.log(
  "[TEST SETUP] Loading .env.test from:",
  path.resolve(currentDir, ".env.test"),
);
const result = config({
  path: path.resolve(currentDir, ".env.test"),
  override: true,
});
console.log("[TEST SETUP] dotenv result:", result);
console.log("[TEST SETUP] DB_HOST after dotenv:", process.env.DB_HOST);

console.log("process.env.DB_HOST:", process.env.DB_HOST);
import { MigrationTestDataSource } from "../src/migration-test-data-source.js";

let migrated = false;

const setup = async () => {
  console.log("\n[TEST SETUP] Running database migrations...\n");
  if (migrated) return;
  console.log(
    "MigrationTestDataSource.options:",
    MigrationTestDataSource.options,
  );
  // Safety: verify migration DS targeting a test DB
  const targetDb = (MigrationTestDataSource.options as { database?: string })
    .database;
  console.log("Target DB for migrations:", targetDb);
  if (!targetDb || !/test/i.test(String(targetDb))) {
    throw new Error(
      `Refusing to run migrations on non-test database: ${targetDb}`,
    );
  }
  console.log("Initializing MigrationTestDataSource...");
  await MigrationTestDataSource.initialize().catch((err) => {
    console.error("Error during MigrationTestDataSource initialization:", err);
    throw err;
  });
  console.log("Running migrations...");
  await MigrationTestDataSource.runMigrations();
  console.log("Migrations complete.");
  await MigrationTestDataSource.destroy();
  console.log("MigrationTestDataSource destroyed.");
  migrated = true;
};

// Export setup function for tests that need database migrations
export const runMigrations = setup;

// Don't run migrations automatically - let tests opt-in by calling runMigrations()
// This prevents database setup for simple unit tests that don't need it
console.log(
  "[TEST SETUP] Migration setup available. Call runMigrations() if needed.",
);
