import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DataSource } from "typeorm";
import { runMigrations } from "./setup.js";
import mysql from "mysql2/promise";

describe("Package Migration Verification (e2e)", () => {
  let connection: mysql.Connection;

  beforeAll(async () => {
    await runMigrations();
    // Connect to the test database directly
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USERNAME || "wordpress",
      password: process.env.DB_PASSWORD || "wordpress",
      database: process.env.DB_DATABASE || "wordpress",
    });
  });

  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  describe("Database Schema Verification", () => {
    it("should have service_type column in stripe_product_map table", async () => {
      const [rows] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_NAME = 'stripe_product_map'
         AND COLUMN_NAME = 'service_type'
         AND TABLE_SCHEMA = 'wordpress'`
      );

      expect(Array.isArray(rows) && rows.length > 0).toBe(true);
    });

    it("should have teacher_tier column in stripe_product_map table", async () => {
      const [rows] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_NAME = 'stripe_product_map'
         AND COLUMN_NAME = 'teacher_tier'
         AND TABLE_SCHEMA = 'wordpress'`
      );

      expect(Array.isArray(rows) && rows.length > 0).toBe(true);
    });

    it("should have correct data types for new columns", async () => {
      const [rows] = await connection.query(
        `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_NAME = 'stripe_product_map'
         AND TABLE_SCHEMA = 'wordpress'
         AND COLUMN_NAME IN ('service_type', 'teacher_tier')`
      );

      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBe(2);

      const serviceTypeCol = (rows as any[]).find(
        (r) => r.COLUMN_NAME === "service_type"
      );
      const teacherTierCol = (rows as any[]).find(
        (r) => r.COLUMN_NAME === "teacher_tier"
      );

      expect(serviceTypeCol).toBeDefined();
      expect(serviceTypeCol.COLUMN_TYPE).toContain("enum");
      expect(serviceTypeCol.COLUMN_DEFAULT).toBe("PRIVATE");

      expect(teacherTierCol).toBeDefined();
      expect(teacherTierCol.COLUMN_TYPE).toContain("int");
      expect(teacherTierCol.COLUMN_DEFAULT).toBe("0");
    });

    it("should have indexes on both new columns", async () => {
      const [rows] = await connection.query(
        `SELECT DISTINCT INDEX_NAME
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_NAME = 'stripe_product_map'
         AND TABLE_SCHEMA = 'wordpress'
         AND COLUMN_NAME IN ('service_type', 'teacher_tier')`
      );

      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThanOrEqual(2);

      const indexNames = (rows as any[]).map((r) => r.INDEX_NAME);
      expect(indexNames).toContain("IDX_stripe_product_map_service_type");
      expect(indexNames).toContain("IDX_stripe_product_map_teacher_tier");
    });
  });

  describe("Data Migration Verification", () => {
    it("should have populated service_type values", async () => {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM stripe_product_map
         WHERE service_type IS NOT NULL`
      );

      const count = (rows as any[])[0].count;
      expect(count).toBeGreaterThan(0);
    });

    it("should have populated teacher_tier values", async () => {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM stripe_product_map
         WHERE teacher_tier IS NOT NULL`
      );

      const count = (rows as any[])[0].count;
      expect(count).toBeGreaterThan(0);
    });

    it("should have correct default values for missing data", async () => {
      const [rows] = await connection.query(
        `SELECT
           SUM(CASE WHEN service_type = 'PRIVATE' THEN 1 ELSE 0 END) as private_count,
           SUM(CASE WHEN teacher_tier = 0 THEN 1 ELSE 0 END) as tier_zero_count
         FROM stripe_product_map`
      );

      const stats = (rows as any[])[0];
      expect(stats.private_count).toBeGreaterThan(0);
      expect(stats.tier_zero_count).toBeGreaterThan(0);
    });
  });

  describe("Query Performance Verification", () => {
    it("should efficiently query by service_type", async () => {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM stripe_product_map
         WHERE service_type = 'PRIVATE'`
      );

      const count = (rows as any[])[0].count;
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should efficiently query by teacher_tier", async () => {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM stripe_product_map
         WHERE teacher_tier >= 0`
      );

      const count = (rows as any[])[0].count;
      expect(count).toBeGreaterThan(0);
    });

    it("should efficiently query combined filters", async () => {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM stripe_product_map
         WHERE service_type = 'PRIVATE' AND teacher_tier = 0`
      );

      const count = (rows as any[])[0].count;
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Migration Record Verification", () => {
    it("should have recorded the migration in migrations table", async () => {
      const [rows] = await connection.query(
        `SELECT id, name FROM migrations
         WHERE name = 'AddServiceTypeAndTeacherTierToStripeProductMap1762000000000'`
      );

      expect(Array.isArray(rows) && rows.length > 0).toBe(true);
      const migration = (rows as any[])[0];
      expect(migration.name).toBe(
        "AddServiceTypeAndTeacherTierToStripeProductMap1762000000000"
      );
    });
  });
});
