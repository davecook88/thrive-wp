import path from "node:path";
import { config } from "dotenv";
import { MigrationTestDataSource } from "../src/migration-test-data-source.js";

// Load test env early
const rootDir = process.cwd();
config({ path: path.resolve(rootDir, "../.env.test") });

export default async function globalSetup() {
  console.log(
    "\n[GLOBAL SETUP] Running migrations once before all test suites...\n",
  );

  const targetDb = (MigrationTestDataSource.options as { database?: string })
    .database;
  if (!targetDb || !/test/i.test(String(targetDb))) {
    throw new Error(
      `Refusing to run migrations on non-test database: ${targetDb}`,
    );
  }

  await MigrationTestDataSource.initialize();
  await MigrationTestDataSource.runMigrations();
  await MigrationTestDataSource.destroy();

  console.log("\n[GLOBAL SETUP] Migrations complete.\n");
}
