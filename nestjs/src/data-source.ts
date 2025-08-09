import 'reflect-metadata';
import { DataSource } from 'typeorm';
import configuration from './config/configuration.js';

// Build configuration once (not using ConfigService here since this file is used by CLI)
const appConfig = configuration();
const db = appConfig.database;

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: db.host,
  port: db.port,
  username: db.username,
  password: db.password,
  database: db.database,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Never in migrations context
  logging: db.logging,
  timezone: 'Z',
});
