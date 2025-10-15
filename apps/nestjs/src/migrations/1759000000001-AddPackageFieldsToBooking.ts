import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add package-related fields to the booking table.
 * This is a separate migration to ensure booking table gets the required columns.
 */
export class AddPackageFieldsToBooking1759000000001
  implements MigrationInterface
{
  name = 'AddPackageFieldsToBooking1759000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add package fields to booking table
    await queryRunner.query(`
      ALTER TABLE booking
      ADD COLUMN IF NOT EXISTS student_package_id int NULL COMMENT 'FK to student_package.id when booking consumed a package credit'
    `);

    await queryRunner.query(`
      ALTER TABLE booking
      ADD COLUMN IF NOT EXISTS credits_cost int NULL COMMENT 'How many credits this booking consumed from the package'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE booking
      DROP COLUMN IF EXISTS student_package_id
    `);

    await queryRunner.query(`
      ALTER TABLE booking
      DROP COLUMN IF EXISTS credits_cost
    `);
  }
}
