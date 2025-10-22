import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
  TableForeignKey,
} from "typeorm";

/**
 * Add Stripe Product Map Foreign Key to Student Package
 *
 * This migration addresses a fundamental architectural issue where student_package
 * records had no direct relationship to the stripe_product_map they were purchased from.
 * The system was relying entirely on metadata snapshots, which breaks referential integrity
 * and makes relational queries difficult.
 *
 * Changes:
 * - Add stripe_product_map_id column to student_package table
 * - Add foreign key constraint to stripe_product_map
 * - Add index for performance
 * - Migrate existing data based on metadata where possible
 */
export class AddStripeProductMapFKToStudentPackage1762000000020
  implements MigrationInterface
{
  name = "AddStripeProductMapFKToStudentPackage1762000000020";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure we don't try to add the column/index/fk if they already exist
    const table = await queryRunner.getTable("student_package");

    if (!table) {
      throw new Error("student_package table not found");
    }

    const hasColumn = table.findColumnByName("stripe_product_map_id");
    if (!hasColumn) {
      await queryRunner.addColumn(
        "student_package",
        new TableColumn({
          name: "stripe_product_map_id",
          type: "int",
          isNullable: true,
          comment:
            "FK to stripe_product_map.id - the package that was purchased",
        }),
      );
    }

    // Add index if missing
    const hasIndex = table.indices.some((idx) =>
      idx.columnNames.includes("stripe_product_map_id"),
    );
    if (!hasIndex) {
      await queryRunner.createIndex(
        "student_package",
        new TableIndex({
          name: "IDX_student_package_stripe_product_map",
          columnNames: ["stripe_product_map_id"],
        }),
      );
    }

    // Add foreign key if missing
    const hasFk = table.foreignKeys.some((fk) =>
      fk.columnNames.includes("stripe_product_map_id"),
    );
    if (!hasFk) {
      await queryRunner.createForeignKey(
        "student_package",
        new TableForeignKey({
          name: "fk_student_package_stripe_product_map",
          columnNames: ["stripe_product_map_id"],
          referencedTableName: "stripe_product_map",
          referencedColumnNames: ["id"],
          onDelete: "SET NULL",
        }),
      );
    }

    // Migrate existing data based on metadata
    // This tries to match existing student_package records to stripe_product_map
    // based on stripeProductId in metadata
    await queryRunner.query(`
      UPDATE student_package sp
      JOIN stripe_product_map spm ON (
        JSON_UNQUOTE(JSON_EXTRACT(sp.metadata, '$.stripeProductId')) = spm.stripe_product_id
        AND spm.deleted_at IS NULL
        AND spm.active = TRUE
      )
      SET sp.stripe_product_map_id = spm.id
      WHERE sp.stripe_product_map_id IS NULL
        AND sp.deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraint
    await queryRunner.query(`
      ALTER TABLE student_package
      DROP FOREIGN KEY fk_student_package_stripe_product_map
    `);

    // Remove index
    await queryRunner.query(`
      ALTER TABLE student_package
      DROP INDEX IDX_student_package_stripe_product_map
    `);

    // Remove column
    await queryRunner.query(`
      ALTER TABLE student_package
      DROP COLUMN stripe_product_map_id
    `);
  }
}
