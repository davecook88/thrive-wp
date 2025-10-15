import { config } from 'dotenv';
import path from 'node:path';
import { MigrationTestDataSource } from '../src/migration-test-data-source.js';

// Load .env.test (already loaded in setupFiles but harmless if re-run)
// Avoid import.meta so this runs reliably as an early Jest setup file.
const currentDir = process.cwd();
config({ path: path.resolve(currentDir, '../.env.test') });

let migrated = false;
console.log('\n[TEST SETUP] Preparing to run database migrations...\n');
const setup = async () => {
  console.log('\n[TEST SETUP] Running database migrations...\n');
  if (migrated) return;
  // Safety: verify migration DS targeting a test DB
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
  migrated = true;
};

// Run migrations once before all tests in a single test file to avoid repeated
// initialize/destroy cycles which can race with Jest's environment teardown.
beforeAll(async () => {
  await setup();
});
