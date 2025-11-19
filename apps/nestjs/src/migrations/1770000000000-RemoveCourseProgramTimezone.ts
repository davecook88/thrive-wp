import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveCourseProgramTimezone1770000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the timezone column from course_program
    // All times are stored in UTC in the database
    // Client applications handle local timezone conversion in the UI
    await queryRunner.dropColumn("course_program", "timezone");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: re-add the timezone column with default value
    await queryRunner.query(`
      ALTER TABLE course_program
      ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'America/New_York'
      COMMENT 'Default timezone for scheduling (removed - all times are UTC)'
    `);
  }
}
