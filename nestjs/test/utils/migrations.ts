import type { DataSource } from 'typeorm';

let migrationsRun = false;

/**
 * Ensures database migrations are executed exactly once for the test run.
 * Call this after Nest application initialization (once DataSource is connected).
 */
export async function ensureMigrations(dataSource: DataSource): Promise<void> {
  if (migrationsRun) return;
  // Use isInitialized to be safe; though in Nest it will be.
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  await dataSource.runMigrations();
  migrationsRun = true;
}
