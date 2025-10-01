import 'reflect-metadata';
import { DataSource } from 'typeorm';
import configuration from './config/configuration.js';
import path from 'path';

// __dirname isn't available in ESM; reconstruct it for glob patterns used below
// In Jest test environment, __dirname might already be available
const currentDir = globalThis?.__dirname || path.resolve(process.cwd(), 'src');

// Build configuration once (not using ConfigService here since this file is used by CLI)
const appConfig = configuration();
const db = appConfig.database;

// Override database name for testing
const testDbConfig = {
  ...db,
  host: process.env.DB_HOST || 'localhost', // Use localhost for tests
  database: process.env.DB_DATABASE_TEST || 'wordpress_test',
  // Use migrations for tests (setup.ts runs runMigrations()).
  // Disable auto-sync to avoid schema/order issues and rely on migrations.
  synchronize: false,
  dropSchema: true, // Keep dropSchema to ensure a clean database before migrations
};

export const TestDataSource = new DataSource({
  type: 'mysql',
  host: testDbConfig.host,
  port: testDbConfig.port,
  username: testDbConfig.username,
  password: testDbConfig.password,
  database: testDbConfig.database,
  entities: [
    currentDir + '/**/*.entity{.ts,.js}',
    currentDir + '/common/entities/*.entity{.ts,.js}',
    currentDir + '/packages/entities/*.entity{.ts,.js}',
    currentDir + '/users/entities/*.entity{.ts,.js}',
    currentDir + '/teachers/entities/*.entity{.ts,.js}',
    currentDir + '/admin/entities/*.entity{.ts,.js}',
    currentDir + '/classes/entities/*.entity{.ts,.js}',
    currentDir + '/courses/entities/*.entity{.ts,.js}',
    currentDir + '/course-teachers/entities/*.entity{.ts,.js}',
    currentDir + '/enrollments/entities/*.entity{.ts,.js}',
    currentDir + '/payments/entities/*.entity{.ts,.js}',
    currentDir + '/sessions/entities/*.entity{.ts,.js}',
    currentDir + '/students/entities/*.entity{.ts,.js}',
    currentDir + '/waitlists/entities/*.entity{.ts,.js}',
  ],
  migrations: [currentDir + '/migrations/*{.ts,.js}'],
  // We rely exclusively on migrations in test setup (setup.ts runs runMigrations()).
  // Disable synchronize to avoid race conditions & duplicate DDL that can lead to deadlocks
  synchronize: false,
  dropSchema: testDbConfig.dropSchema,
  logging: false, // Disable logging for tests
  timezone: 'Z',
  extra: {
    // Allow a small pool; a single connection can become a bottleneck and increase lock wait time
    connectionLimit: 5,
  },
});
