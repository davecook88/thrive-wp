import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Remove rrule, start_date, and end_date columns from group_class table
 * Each GroupClass now has exactly one Session, so schedule info lives on the Session
 */
export class RemoveGroupClassRruleFields1730131200000
  implements MigrationInterface
{
  name = "RemoveGroupClassRruleFields1730131200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the schedule-related columns from group_class
    await queryRunner.query(`
      ALTER TABLE group_class
        DROP COLUMN rrule,
        DROP COLUMN start_date,
        DROP COLUMN end_date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore columns if we need to roll back
    await queryRunner.query(`
      ALTER TABLE group_class
        ADD COLUMN rrule VARCHAR(500) NULL COMMENT 'RFC5545 RRULE for recurring',
        ADD COLUMN start_date DATE NULL COMMENT 'First occurrence date',
        ADD COLUMN end_date DATE NULL COMMENT 'Last occurrence date'
    `);
  }
}
