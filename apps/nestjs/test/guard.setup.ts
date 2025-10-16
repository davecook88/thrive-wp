// Hard guard: abort the entire test run if configured DB name is unsafe.
// This executes after env.setup.ts but before any tests (setupFiles stage).

const dbName = process.env.DB_DATABASE_TEST || process.env.DB_DATABASE || "";

if (!/test/i.test(dbName)) {
  console.error(
    `\n[TEST GUARD] Database name "${dbName}" does not contain 'test'. Aborting test run to protect real data.\n` +
      "Set DB_DATABASE_TEST to a safe test database (e.g., wordpress_test).\n",
  );
  process.exit(1);
}
