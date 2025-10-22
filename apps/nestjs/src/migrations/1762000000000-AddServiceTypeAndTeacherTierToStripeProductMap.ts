import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add service_type and teacher_tier columns to stripe_product_map.
 * These fields are being promoted from JSON metadata to dedicated indexed columns
 * for better query performance and data integrity.
 *
 * Migration strategy:
 * 1. Add new columns with defaults
 * 2. Migrate existing data from JSON metadata
 * 3. Keep metadata field for backward compatibility during transition
 */
export class AddServiceTypeAndTeacherTierToStripeProductMap1762000000000
  implements MigrationInterface
{
  name = "AddServiceTypeAndTeacherTierToStripeProductMap1762000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add service_type column
    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      ADD COLUMN service_type ENUM('PRIVATE', 'GROUP', 'COURSE')
      DEFAULT 'PRIVATE'
      COMMENT 'Service type: PRIVATE, GROUP, or COURSE'
      AFTER scope_id
    `);

    // Add teacher_tier column
    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      ADD COLUMN teacher_tier INT
      DEFAULT 0
      COMMENT 'Teacher tier for premium teacher pricing'
      AFTER service_type
    `);

    // Add indexes on new columns for query performance
    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      ADD INDEX IDX_stripe_product_map_service_type (service_type)
    `);

    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      ADD INDEX IDX_stripe_product_map_teacher_tier (teacher_tier)
    `);

    // Migrate existing data from JSON metadata to columns
    // Extract service_type from metadata JSON
    await queryRunner.query(`
      UPDATE stripe_product_map
      SET service_type = COALESCE(
        NULLIF(
          JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.service_type')),
          ''
        ),
        'PRIVATE'
      )
      WHERE metadata IS NOT NULL
      AND JSON_EXTRACT(metadata, '$.service_type') IS NOT NULL
    `);

    // Extract teacher_tier from metadata JSON and convert to integer
    await queryRunner.query(`
      UPDATE stripe_product_map
      SET teacher_tier = CAST(
        COALESCE(
          NULLIF(
            NULLIF(
              JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.teacher_tier')),
              'null'
            ),
            ''
          ),
          '0'
        ) AS SIGNED
      )
      WHERE metadata IS NOT NULL
      AND JSON_EXTRACT(metadata, '$.teacher_tier') IS NOT NULL
    `);

    // Verify migration - log summary
    await queryRunner.query(`
      SELECT
        COUNT(*) as total_records,
        SUM(CASE WHEN service_type IS NOT NULL THEN 1 ELSE 0 END) as service_type_populated,
        SUM(CASE WHEN teacher_tier IS NOT NULL THEN 1 ELSE 0 END) as teacher_tier_populated
      FROM stripe_product_map
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      DROP INDEX IDX_stripe_product_map_teacher_tier
    `);

    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      DROP INDEX IDX_stripe_product_map_service_type
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      DROP COLUMN teacher_tier
    `);

    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      DROP COLUMN service_type
    `);
  }
}
