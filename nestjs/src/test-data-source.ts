import 'reflect-metadata';
import { DataSource } from 'typeorm';
import configuration from './config/configuration.js';
import { fileURLToPath } from 'url';
import path from 'path';

// __dirname isn't available in ESM; reconstruct it for glob patterns used below
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build configuration once (not using ConfigService here since this file is used by CLI)
const appConfig = configuration();
const db = appConfig.database;

// Override database name for testing
const testDbConfig = {
  ...db,
  host: process.env.DB_HOST || 'localhost', // Use localhost for tests
  database: process.env.DB_DATABASE_TEST || 'wordpress_test',
  synchronize: true, // Enable sync for tests
  dropSchema: true, // Drop schema before sync for clean tests
};

export const TestDataSource = new DataSource({
  type: 'mysql',
  host: testDbConfig.host,
  port: testDbConfig.port,
  username: testDbConfig.username,
  password: testDbConfig.password,
  database: testDbConfig.database,
  entities: [
    __dirname + '/**/*.entity{.ts,.js}',
    __dirname + '/common/entities/*.entity{.ts,.js}',
    __dirname + '/users/entities/*.entity{.ts,.js}',
    __dirname + '/teachers/entities/*.entity{.ts,.js}',
    __dirname + '/admin/entities/*.entity{.ts,.js}',
    __dirname + '/classes/entities/*.entity{.ts,.js}',
    __dirname + '/courses/entities/*.entity{.ts,.js}',
    __dirname + '/course-teachers/entities/*.entity{.ts,.js}',
    __dirname + '/enrollments/entities/*.entity{.ts,.js}',
    __dirname + '/payments/entities/*.entity{.ts,.js}',
    __dirname + '/sessions/entities/*.entity{.ts,.js}',
    __dirname + '/students/entities/*.entity{.ts,.js}',
    __dirname + '/waitlists/entities/*.entity{.ts,.js}',
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Use migrations instead for proper foreign key handling
  dropSchema: testDbConfig.dropSchema,
  logging: false, // Disable logging for tests
  timezone: 'Z',
  extra: {
    connectionLimit: 1, // Limit connections for tests
  },
});
