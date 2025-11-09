import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveCohortsTimezone1767000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the timezone column from course_cohort table
    // All times are now stored in UTC and displayed in user's local timezone on client
    await queryRunner.query(`
      ALTER TABLE course_cohort DROP COLUMN timezone
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the timezone column if we need to rollback
    await queryRunner.query(`
      ALTER TABLE course_cohort
      ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'America/New_York'
      COMMENT 'Timezone for cohort (inherits from course by default)'
      AFTER end_date
    `);
  }
}
