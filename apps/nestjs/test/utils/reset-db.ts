import type { DataSource } from 'typeorm';

/**
 * Truncate all (non-skipped) tables in the CURRENT database for a DataSource.
 *
 * SAFETY GUARDS:
 * - Will only operate when the database name "looks like" a test DB (contains 'test')
 * - Refuses to run if NODE_ENV === 'production'
 * - Can be force‑overridden (NOT RECOMMENDED) via ALLOW_RESET_NON_TEST_DB=true
 *
 * If you truly need to target a non-standard test DB name, either rename it to include
 * the word 'test' (preferred) or set the explicit allow env var for a single run.
 */

// Tables to skip (migration metadata + any static reference tables if added later)
const SKIP_TABLES = new Set<string>(['migrations', 'typeorm_metadata']);

// Hard blocked names to provide an extra safety net
const BLOCKED_DB_NAMES = new Set<string>(['wordpress', 'production', 'prod']);

export async function resetDatabase(ds: DataSource): Promise<void> {
  if (!ds) {
    throw new Error('resetDatabase called with undefined DataSource');
  }
  const queryRunner = ds.createQueryRunner();
  const dbName = String(
    (queryRunner.connection.options as { database?: string }).database || '',
  );

  // Enforce explicit expected test DB (optional but stronger)
  const expectedTestDb = process.env.DB_DATABASE_TEST;
  if (process.env.NODE_ENV === 'test') {
    if (!expectedTestDb) {
      await queryRunner.release();
      throw new Error(
        'DB_DATABASE_TEST must be set in test environment for safety.',
      );
    }
    if (dbName !== expectedTestDb) {
      await queryRunner.release();
      throw new Error(
        `Connected DB ("${dbName}") does not match DB_DATABASE_TEST ("${expectedTestDb}"). Aborting reset to prevent data loss.`,
      );
    }
  }

  const allowOverride = process.env.ALLOW_RESET_NON_TEST_DB === 'true';
  const isTestLike = /test/i.test(dbName); // simple heuristic

  if (process.env.NODE_ENV === 'production') {
    await queryRunner.release();
    throw new Error('Refusing to reset database in production environment.');
  }

  if (BLOCKED_DB_NAMES.has(dbName) && !allowOverride) {
    await queryRunner.release();
    throw new Error(
      `Refusing to reset blocked database name "${dbName}". Set ALLOW_RESET_NON_TEST_DB=true ONLY if you are absolutely sure.`,
    );
  }

  if (!isTestLike && !allowOverride) {
    await queryRunner.release();
    throw new Error(
      `Refusing to reset non-test database "${dbName}" (name must contain 'test'). To override, set ALLOW_RESET_NON_TEST_DB=true (NOT RECOMMENDED).`,
    );
  }

  try {
    const rawTables = (await queryRunner.query(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE()`,
    )) as unknown;
    const tables = rawTables as Array<{ TABLE_NAME: string }>;
    // Disable FK checks
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=0');
    for (const { TABLE_NAME } of tables) {
      if (SKIP_TABLES.has(TABLE_NAME)) continue;
      await queryRunner.query(`TRUNCATE TABLE \`${TABLE_NAME}\``);
    }
  } finally {
    // Re-enable FK checks
    try {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS=1');
    } finally {
      await queryRunner.release();
    }
  }
}
