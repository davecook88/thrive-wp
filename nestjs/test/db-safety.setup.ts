// Global DB safety assertions executed after env is loaded but before tests run.
// Fails fast if test environment is misconfigured.
// This does NOT connect to the DB; it only inspects env variables.

const env = process.env.NODE_ENV;
if (env === 'test') {
  const testDb = process.env.DB_DATABASE_TEST;
  if (!testDb) {
    throw new Error('DB_DATABASE_TEST must be defined in test environment.');
  }
  if (!/test/i.test(testDb)) {
    throw new Error(
      `DB_DATABASE_TEST value "${testDb}" must contain 'test' for safety.`,
    );
  }
  // Optional: prevent accidental production DB var leakage
  if (
    process.env.DB_DATABASE &&
    /prod|production/i.test(process.env.DB_DATABASE)
  ) {
    // Not throwing, but warn; escalate to throw if desired
    console.warn(
      '[DB SAFETY] Warning: DB_DATABASE is set to a production-like name during tests. Tests will still use DB_DATABASE_TEST.',
    );
  }
} else if (env && env !== 'test') {
  const configured = process.env.DB_DATABASE || '';
  if (/test/i.test(configured)) {
    throw new Error(
      `Environment ${env} is pointing at test-like database name "${configured}". Refusing to start.`,
    );
  }
}
