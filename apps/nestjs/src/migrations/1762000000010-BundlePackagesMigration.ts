import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Bundle Packages Migration
 *
 * Major schema refactoring to support package bundles containing multiple service types.
 * Each bundle can include PRIVATE, GROUP, and COURSE credits.
 *
 * Single source of truth: PackageUse is the authoritative record.
 * Remaining credits are computed as: total_sessions - SUM(credits_used from PackageUse)
 *
 * Changes:
 * 1. Create `package_allowance` table - defines bundle contents
 * 2. Add service_type and credits_used to package_use table (for tracking which balance type was used)
 * 3. Remove service_type and teacher_tier from stripe_product_map (moved to package_allowance)
 * 4. Remove remaining_sessions from student_package (computed from PackageUse)
 * 5. Migrate existing stripe_product_map data to package_allowance
 *
 * This is a data-preserving migration that maintains backward compatibility through metadata.
 */
export class BundlePackagesMigration1762000000010
  implements MigrationInterface
{
  name = "BundlePackagesMigration1762000000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create package_allowance table
    await queryRunner.query(`
      CREATE TABLE package_allowance (
        id INT PRIMARY KEY AUTO_INCREMENT,
        stripe_product_map_id INT NOT NULL,
        service_type ENUM('PRIVATE', 'GROUP', 'COURSE') NOT NULL,
        teacher_tier INT NOT NULL DEFAULT 0 COMMENT 'Teacher tier restriction (0 = any)',
        credits INT NOT NULL COMMENT 'Number of credits of this type in bundle',
        credit_unit_minutes INT NOT NULL COMMENT 'Duration per credit: 15, 30, 45, or 60',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        INDEX IDX_stripe_product_map_id (stripe_product_map_id),
        INDEX IDX_service_type (service_type),
        CONSTRAINT fk_allowance_product FOREIGN KEY (stripe_product_map_id)
          REFERENCES stripe_product_map(id) ON DELETE CASCADE,
        CONSTRAINT CHK_credits_positive CHECK (credits > 0),
        CONSTRAINT CHK_credit_unit_minutes CHECK (credit_unit_minutes IN (15, 30, 45, 60))
      ) ENGINE=InnoDB;
    `);

    // Step 2: Add service_type and credits_used columns to package_use
    await queryRunner.query(`
      ALTER TABLE package_use
      ADD COLUMN service_type ENUM('PRIVATE', 'GROUP', 'COURSE') NULL DEFAULT NULL
        AFTER session_id,
      ADD COLUMN credits_used INT NOT NULL DEFAULT 1
        AFTER service_type
    `);

    // Step 3: Migrate existing stripe_product_map rows to package_allowance
    // For each existing stripe_product_map entry, create a corresponding package_allowance
    await queryRunner.query(`
      INSERT INTO package_allowance (stripe_product_map_id, service_type, teacher_tier, credits, credit_unit_minutes)
      SELECT
        id,
        COALESCE(service_type, 'PRIVATE'),
        COALESCE(teacher_tier, 0),
        COALESCE(
          CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.credits')) AS SIGNED),
          1
        ) as credits,
        COALESCE(
          CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.credit_unit_minutes')) AS SIGNED),
          30
        ) as credit_unit_minutes
      FROM stripe_product_map
      WHERE deleted_at IS NULL
      AND active = TRUE
    `);

    // Step 4: Remove service_type and teacher_tier from stripe_product_map
    // First drop the indexes
    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      DROP INDEX IF EXISTS IDX_stripe_product_map_service_type
    `);

    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      DROP INDEX IF EXISTS IDX_stripe_product_map_teacher_tier
    `);

    // Then drop the columns
    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      DROP COLUMN service_type
    `);

    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      DROP COLUMN teacher_tier
    `);

    // Step 5: Remove remaining_sessions from student_package
    await queryRunner.query(`
      ALTER TABLE student_package
      DROP COLUMN remaining_sessions
    `);

    // Step 6: Verify migration - count rows
    const packageAllowanceCount = (await queryRunner.query(
      `SELECT COUNT(*) as count FROM package_allowance`,
    )) as {
      count: number;
    }[];

    console.log(`✓ Migration complete:`);
    console.log(
      `  - Created ${packageAllowanceCount[0]?.count || 0} package allowances`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order: undo in reverse of up() steps

    // Step 1: Restore remaining_sessions to student_package
    await queryRunner.query(`
      ALTER TABLE student_package
      ADD COLUMN remaining_sessions INT NOT NULL DEFAULT 0
        AFTER total_sessions
    `);

    // Restore data by computing from PackageUse
    await queryRunner.query(`
      UPDATE student_package sp
      SET remaining_sessions = (
        sp.total_sessions - COALESCE(
          (SELECT SUM(credits_used) FROM package_use WHERE student_package_id = sp.id AND deleted_at IS NULL),
          0
        )
      )
      WHERE sp.deleted_at IS NULL
    `);

    // Step 2: Restore service_type and teacher_tier to stripe_product_map
    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      ADD COLUMN service_type ENUM('PRIVATE', 'GROUP', 'COURSE')
        DEFAULT 'PRIVATE'
        COMMENT 'Service type: PRIVATE, GROUP, or COURSE'
        AFTER scope_id
    `);

    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      ADD COLUMN teacher_tier INT
        DEFAULT 0
        COMMENT 'Teacher tier for premium teacher pricing'
        AFTER service_type
    `);

    // Restore data from allowances
    await queryRunner.query(`
      UPDATE stripe_product_map spm
      SET
        service_type = (
          SELECT service_type FROM package_allowance
          WHERE stripe_product_map_id = spm.id
          LIMIT 1
        ),
        teacher_tier = (
          SELECT teacher_tier FROM package_allowance
          WHERE stripe_product_map_id = spm.id
          LIMIT 1
        )
      WHERE spm.id IN (
        SELECT DISTINCT stripe_product_map_id FROM package_allowance
      )
    `);

    // Recreate indexes
    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      ADD INDEX IDX_stripe_product_map_service_type (service_type)
    `);

    await queryRunner.query(`
      ALTER TABLE stripe_product_map
      ADD INDEX IDX_stripe_product_map_teacher_tier (teacher_tier)
    `);

    // Step 3: Remove service_type and credits_used from package_use
    await queryRunner.query(`
      ALTER TABLE package_use
      DROP COLUMN credits_used
    `);

    await queryRunner.query(`
      ALTER TABLE package_use
      DROP COLUMN service_type
    `);

    // Step 4: Drop package_allowance table
    await queryRunner.query(`DROP TABLE IF EXISTS package_allowance`);
  }
}
