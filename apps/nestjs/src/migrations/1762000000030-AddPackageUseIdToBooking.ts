import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add package_use_id field to the booking table.
 * This creates a link from booking to the specific package_use record that was created when the booking was made.
 */
export class AddPackageUseIdToBooking1762000000030
  implements MigrationInterface
{
  name = "AddPackageUseIdToBooking1762000000030";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add package_use_id column to booking table
    await queryRunner.query(`
      ALTER TABLE booking
      ADD COLUMN package_use_id int NULL COMMENT 'FK to package_use.id - tracks which specific package use record this booking created'
    `);

    // Add index for faster lookups
    await queryRunner.query(`
      CREATE INDEX IDX_booking_package_use_id ON booking(package_use_id)
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE booking
      ADD CONSTRAINT fk_booking_package_use
      FOREIGN KEY (package_use_id) REFERENCES package_use(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE booking
      DROP FOREIGN KEY fk_booking_package_use
    `);

    // Drop index
    await queryRunner.query(`
      DROP INDEX IDX_booking_package_use_id ON booking
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE booking
      DROP COLUMN package_use_id
    `);
  }
}
