import 'reflect-metadata';
import { DataSource } from 'typeorm';
import configuration from './config/configuration.js';
import path from 'path';

const appConfig = configuration();
const db = appConfig.database;

export const MigrationTestDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || db.host,
  port: db.port,
  username: db.username,
  password: db.password,
  database: process.env.DB_DATABASE_TEST || 'wordpress_test',
  entities: [path.resolve(process.cwd(), 'src/**/*.entity{.ts,.js}')],
  migrations: [path.resolve(process.cwd(), 'src/migrations/*{.ts,.js}')],
  synchronize: false,
  dropSchema: true,
  logging: false,
});
