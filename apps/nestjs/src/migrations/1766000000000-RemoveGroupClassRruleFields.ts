import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Remove rrule, start_date, and end_date columns from group_class table
 * Each GroupClass now has exactly one Session, so schedule info lives on the Session
 */
export class RemoveGroupClassRruleFields1766000000000
  implements MigrationInterface
{
  name = "RemoveGroupClassRruleFields1766000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the schedule-related columns from group_class if they exist
    // Check which columns actually exist before dropping to avoid errors
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_class'
    `);

    const columnNames = columns.map((col: any) => col.COLUMN_NAME);
    const dropStatements = [];

    if (columnNames.includes('rrule')) {
      dropStatements.push('DROP COLUMN rrule');
    }
    if (columnNames.includes('start_date')) {
      dropStatements.push('DROP COLUMN start_date');
    }
    if (columnNames.includes('end_date')) {
      dropStatements.push('DROP COLUMN end_date');
    }

    // Only run ALTER TABLE if there are columns to drop
    if (dropStatements.length > 0) {
      await queryRunner.query(`
        ALTER TABLE group_class
        ${dropStatements.join(', ')}
      `);
    }
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
