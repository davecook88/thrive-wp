import "reflect-metadata";
import { DataSource } from "typeorm";
import configuration from "./config/configuration.js";
// Import all migrations directly - this allows them to be transformed by Vitest/SWC
import * as migrations from "./migrations/index.js";

const appConfig = configuration();
const db = appConfig.database;

console.log("db config:", db);

// Extract migration classes from the imported module
// TypeORM accepts an array of migration classes directly
const migrationClasses = Object.values(migrations);
console.log(
  `[MIGRATIONS] Loaded ${migrationClasses.length} migrations directly (no file glob needed)`,
);

export const MigrationTestDataSource = new DataSource({
  type: "mysql",
  host:
    process.env.NODE_ENV === "test"
      ? "127.0.0.1"
      : process.env.DB_HOST || db.host,
  port: db.port,
  username: db.username,
  password: db.password,
  database: process.env.DB_DATABASE_TEST || "wordpress_test",
  // Entities not needed for migrations - migrations define the schema
  entities: [],
  // Pass migration classes directly instead of file paths
  // This works perfectly with Vitest/SWC since imports are transformed
  migrations: migrationClasses,
  synchronize: false,
  dropSchema: true,
  logging: false,
});
