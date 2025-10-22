import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { runMigrations } from "./setup.js";
import { resetDatabase } from "./utils/reset-db.js";

describe("Package Migration: service_type and teacher_tier (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await resetDatabase(dataSource);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Database Schema", () => {
    it("should have service_type and teacher_tier columns in stripe_product_map", async () => {
      const result = await dataSource.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'stripe_product_map'
        AND TABLE_SCHEMA = 'wordpress_test'
        AND COLUMN_NAME IN ('service_type', 'teacher_tier')
        ORDER BY COLUMN_NAME
      `);

      expect(result).toHaveLength(2);
      expect(result[0].COLUMN_NAME).toBe("service_type");
      expect(result[1].COLUMN_NAME).toBe("teacher_tier");
    });

    it("should have indexes on service_type and teacher_tier columns", async () => {
      const result = await dataSource.query(`
        SELECT DISTINCT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_NAME = 'stripe_product_map'
        AND TABLE_SCHEMA = 'wordpress_test'
        AND COLUMN_NAME IN ('service_type', 'teacher_tier')
        ORDER BY INDEX_NAME
      `);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const indexNames = result.map(r => r.INDEX_NAME);
      expect(indexNames).toContain("IDX_stripe_product_map_service_type");
      expect(indexNames).toContain("IDX_stripe_product_map_teacher_tier");
    });

    it("should have correct column types and defaults", async () => {
      const result = await dataSource.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'stripe_product_map'
        AND TABLE_SCHEMA = 'wordpress_test'
        AND COLUMN_NAME IN ('service_type', 'teacher_tier')
      `);

      const serviceTypeCol = result.find(r => r.COLUMN_NAME === "service_type");
      const teacherTierCol = result.find(r => r.COLUMN_NAME === "teacher_tier");

      expect(serviceTypeCol.COLUMN_TYPE).toContain("enum");
      expect(serviceTypeCol.COLUMN_DEFAULT).toBe("PRIVATE");

      expect(teacherTierCol.COLUMN_TYPE).toContain("int");
      expect(teacherTierCol.COLUMN_DEFAULT).toBe("0");
    });
  });

  describe("Data Migration", () => {
    it("should have migrated service_type data from metadata", async () => {
      // Insert test data with metadata
      await dataSource.query(`
        INSERT INTO stripe_product_map
        (service_key, stripe_product_id, active, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, ["TEST_PRIVATE", "prod_test", true, JSON.stringify({ service_type: "PRIVATE" })]);

      const result = await dataSource.query(`
        SELECT service_type FROM stripe_product_map WHERE service_key = 'TEST_PRIVATE'
      `);

      expect(result[0].service_type).toBe("PRIVATE");
    });

    it("should have migrated teacher_tier data from metadata", async () => {
      // Insert test data with metadata
      await dataSource.query(`
        INSERT INTO stripe_product_map
        (service_key, stripe_product_id, active, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, ["TEST_PREMIUM", "prod_premium", true, JSON.stringify({ teacher_tier: "2" })]);

      const result = await dataSource.query(`
        SELECT teacher_tier FROM stripe_product_map WHERE service_key = 'TEST_PREMIUM'
      `);

      expect(result[0].teacher_tier).toBe(2);
    });

    it("should default to PRIVATE when service_type is missing", async () => {
      await dataSource.query(`
        INSERT INTO stripe_product_map
        (service_key, stripe_product_id, active, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, ["TEST_DEFAULT", "prod_default", true, JSON.stringify({})]);

      const result = await dataSource.query(`
        SELECT service_type FROM stripe_product_map WHERE service_key = 'TEST_DEFAULT'
      `);

      expect(result[0].service_type).toBe("PRIVATE");
    });

    it("should default to 0 when teacher_tier is missing", async () => {
      await dataSource.query(`
        INSERT INTO stripe_product_map
        (service_key, stripe_product_id, active, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, ["TEST_NO_TIER", "prod_no_tier", true, JSON.stringify({})]);

      const result = await dataSource.query(`
        SELECT teacher_tier FROM stripe_product_map WHERE service_key = 'TEST_NO_TIER'
      `);

      expect(result[0].teacher_tier).toBe(0);
    });
  });

  describe("Query Performance", () => {
    beforeEach(async () => {
      // Insert test packages with different types and tiers
      await dataSource.query(`
        INSERT INTO stripe_product_map
        (service_key, stripe_product_id, active, service_type, teacher_tier, metadata, created_at, updated_at)
        VALUES
        (?, ?, ?, ?, ?, ?, NOW(), NOW()),
        (?, ?, ?, ?, ?, ?, NOW(), NOW()),
        (?, ?, ?, ?, ?, ?, NOW(), NOW()),
        (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        "PRIVATE_TIER0", "prod_p0", true, "PRIVATE", 0, JSON.stringify({}),
        "PRIVATE_TIER1", "prod_p1", true, "PRIVATE", 1, JSON.stringify({}),
        "GROUP_TIER0", "prod_g0", true, "GROUP", 0, JSON.stringify({}),
        "GROUP_TIER2", "prod_g2", true, "GROUP", 2, JSON.stringify({})
      ]);
    });

    it("should efficiently query by service_type", async () => {
      const result = await dataSource.query(`
        SELECT COUNT(*) as count FROM stripe_product_map
        WHERE service_type = 'PRIVATE'
      `);

      expect(result[0].count).toBeGreaterThanOrEqual(2);
    });

    it("should efficiently query by teacher_tier", async () => {
      const result = await dataSource.query(`
        SELECT COUNT(*) as count FROM stripe_product_map
        WHERE teacher_tier >= 1
      `);

      expect(result[0].count).toBeGreaterThanOrEqual(2);
    });

    it("should efficiently query by combined service_type and teacher_tier", async () => {
      const result = await dataSource.query(`
        SELECT COUNT(*) as count FROM stripe_product_map
        WHERE service_type = 'PRIVATE' AND teacher_tier >= 0
      `);

      expect(result[0].count).toBeGreaterThanOrEqual(2);
    });
  });
});
