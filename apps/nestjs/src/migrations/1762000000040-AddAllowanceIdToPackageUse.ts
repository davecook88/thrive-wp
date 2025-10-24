import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add allowance_id field to the package_use table.
 * This links each package use to the specific allowance within the package that was used.
 * Allows packages to contain multiple allowances (e.g., 5 private + 3 group credits).
 */
export class AddAllowanceIdToPackageUse1762000000040
  implements MigrationInterface
{
  name = "AddAllowanceIdToPackageUse1762000000040";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add allowance_id column to package_use table
    await queryRunner.query(`
      ALTER TABLE package_use
      ADD COLUMN allowance_id int NULL COMMENT 'FK to package_allowance.id - which specific allowance within the package was used'
    `);

    // Add index for faster lookups
    await queryRunner.query(`
      CREATE INDEX IDX_package_use_allowance_id ON package_use(allowance_id)
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE package_use
      ADD CONSTRAINT fk_package_use_allowance
      FOREIGN KEY (allowance_id) REFERENCES package_allowance(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE package_use
      DROP FOREIGN KEY fk_package_use_allowance
    `);

    // Drop index
    await queryRunner.query(`
      DROP INDEX IDX_package_use_allowance_id ON package_use
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE package_use
      DROP COLUMN allowance_id
    `);
  }
}
