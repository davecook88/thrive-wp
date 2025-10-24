import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  Table,
  TableIndex,
} from "typeorm";

export class SimplifyCourseProgramSchema1763000000000
  implements MigrationInterface
{
  name = "SimplifyCourseProgramSchema1763000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add course_program_id to package_allowance
    await queryRunner.addColumn(
      "package_allowance",
      new TableColumn({
        name: "course_program_id",
        type: "int",
        isNullable: true,
        comment: "FK to course_program (only for COURSE service type)",
      }),
    );

    // 2. Add FK constraint
    await queryRunner.createForeignKey(
      "package_allowance",
      new TableForeignKey({
        name: "FK_package_allowance_course_program",
        columnNames: ["course_program_id"],
        referencedTableName: "course_program",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    // 3. Add index for efficient course allowance lookups
    await queryRunner.createIndex(
      "package_allowance",
      new TableIndex({
        name: "IDX_package_allowance_course_program",
        columnNames: ["course_program_id"],
      }),
    );

    // 4. Create student_course_step_progress table (lightweight progress tracking)
    await queryRunner.createTable(
      new Table({
        name: "student_course_step_progress",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "student_package_id",
            type: "int",
            isNullable: false,
            comment: "FK to student_package (the course purchase)",
          },
          {
            name: "course_step_id",
            type: "int",
            isNullable: false,
            comment: "FK to course_step",
          },
          {
            name: "status",
            type: "enum",
            enum: ["UNBOOKED", "BOOKED", "COMPLETED", "MISSED", "CANCELLED"],
            default: "'UNBOOKED'",
          },
          {
            name: "session_id",
            type: "int",
            isNullable: true,
            comment: "FK to session (if booked)",
          },
          {
            name: "booked_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
          {
            name: "completed_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
          {
            name: "created_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "updated_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
            onUpdate: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "deleted_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 5. Add FKs for progress table
    await queryRunner.createForeignKey(
      "student_course_step_progress",
      new TableForeignKey({
        name: "FK_student_course_step_progress_package",
        columnNames: ["student_package_id"],
        referencedTableName: "student_package",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "student_course_step_progress",
      new TableForeignKey({
        name: "FK_student_course_step_progress_step",
        columnNames: ["course_step_id"],
        referencedTableName: "course_step",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "student_course_step_progress",
      new TableForeignKey({
        name: "FK_student_course_step_progress_session",
        columnNames: ["session_id"],
        referencedTableName: "session",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );

    // 6. Add unique constraint (one progress per package+step)
    await queryRunner.createIndex(
      "student_course_step_progress",
      new TableIndex({
        name: "IDX_student_course_step_progress_unique",
        columnNames: ["student_package_id", "course_step_id"],
        isUnique: true,
      }),
    );

    // 7. Add indexes for efficient queries
    await queryRunner.createIndex(
      "student_course_step_progress",
      new TableIndex({
        name: "IDX_student_course_step_progress_package",
        columnNames: ["student_package_id"],
      }),
    );

    await queryRunner.createIndex(
      "student_course_step_progress",
      new TableIndex({
        name: "IDX_student_course_step_progress_step",
        columnNames: ["course_step_id"],
      }),
    );

    // 8. Drop redundant course tables
    await queryRunner.dropTable("student_course_progress", true);
    await queryRunner.dropTable("student_course_enrollment", true);
    await queryRunner.dropTable("course_bundle_component", true);

    // 9. Remove redundant stripe columns from course_program
    const courseProgramTable = await queryRunner.getTable("course_program");
    if (courseProgramTable) {
      const stripeProductIdColumn =
        courseProgramTable.findColumnByName("stripe_product_id");
      if (stripeProductIdColumn) {
        await queryRunner.dropColumn("course_program", "stripe_product_id");
      }
      const stripePriceIdColumn =
        courseProgramTable.findColumnByName("stripe_price_id");
      if (stripePriceIdColumn) {
        await queryRunner.dropColumn("course_program", "stripe_price_id");
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Re-add stripe columns to course_program
    await queryRunner.addColumn(
      "course_program",
      new TableColumn({
        name: "stripe_product_id",
        type: "varchar",
        length: "255",
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      "course_program",
      new TableColumn({
        name: "stripe_price_id",
        type: "varchar",
        length: "255",
        isNullable: true,
      }),
    );

    // 2. Recreate course_bundle_component table
    await queryRunner.createTable(
      new Table({
        name: "course_bundle_component",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "course_program_id", type: "int", isNullable: false },
          {
            name: "component_type",
            type: "enum",
            enum: ["PRIVATE_CREDIT", "GROUP_CREDIT"],
            isNullable: false,
          },
          {
            name: "quantity",
            type: "smallint",
            isNullable: false,
            unsigned: true,
            default: 1,
          },
          {
            name: "description",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          { name: "metadata", type: "json", isNullable: true },
          {
            name: "created_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "updated_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
            onUpdate: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "deleted_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ["course_program_id"],
            referencedTableName: "course_program",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
        indices: [
          {
            name: "IDX_course_bundle_program",
            columnNames: ["course_program_id"],
          },
        ],
      }),
      true,
    );

    // 3. Recreate student_course_enrollment table
    await queryRunner.createTable(
      new Table({
        name: "student_course_enrollment",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "course_program_id", type: "int", isNullable: false },
          { name: "student_id", type: "int", isNullable: false },
          {
            name: "stripe_payment_intent_id",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "stripe_product_id",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "stripe_price_id",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "status",
            type: "enum",
            enum: ["ACTIVE", "CANCELLED", "REFUNDED"],
            default: "'ACTIVE'",
          },
          {
            name: "purchased_at",
            type: "datetime",
            precision: 3,
            isNullable: false,
          },
          {
            name: "cancelled_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
          {
            name: "refunded_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
          { name: "metadata", type: "json", isNullable: true },
          {
            name: "created_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "updated_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
            onUpdate: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "deleted_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ["course_program_id"],
            referencedTableName: "course_program",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
          {
            columnNames: ["student_id"],
            referencedTableName: "student",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
        indices: [
          {
            name: "IDX_student_course_enrollment_unique",
            columnNames: ["course_program_id", "student_id"],
            isUnique: true,
          },
          {
            name: "IDX_student_course_enrollment_student",
            columnNames: ["student_id"],
          },
          {
            name: "IDX_student_course_enrollment_payment",
            columnNames: ["stripe_payment_intent_id"],
          },
        ],
      }),
      true,
    );

    // 4. Recreate student_course_progress table
    await queryRunner.createTable(
      new Table({
        name: "student_course_progress",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "student_course_enrollment_id",
            type: "int",
            isNullable: false,
          },
          { name: "course_step_id", type: "int", isNullable: false },
          { name: "selected_option_id", type: "int", isNullable: true },
          {
            name: "status",
            type: "enum",
            enum: ["UNBOOKED", "BOOKED", "COMPLETED", "MISSED", "CANCELLED"],
            default: "'UNBOOKED'",
          },
          {
            name: "booked_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
          {
            name: "completed_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
          {
            name: "cancelled_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
          { name: "session_id", type: "int", isNullable: true },
          {
            name: "credit_consumed",
            type: "tinyint",
            isNullable: false,
            default: 0,
          },
          {
            name: "created_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "updated_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
            onUpdate: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "deleted_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ["student_course_enrollment_id"],
            referencedTableName: "student_course_enrollment",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
          {
            columnNames: ["course_step_id"],
            referencedTableName: "course_step",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
          {
            columnNames: ["selected_option_id"],
            referencedTableName: "course_step_option",
            referencedColumnNames: ["id"],
            onDelete: "SET NULL",
          },
          {
            columnNames: ["session_id"],
            referencedTableName: "session",
            referencedColumnNames: ["id"],
            onDelete: "SET NULL",
          },
        ],
        indices: [
          {
            name: "IDX_student_course_progress_unique",
            columnNames: ["student_course_enrollment_id", "course_step_id"],
            isUnique: true,
          },
          {
            name: "IDX_student_course_progress_enrollment",
            columnNames: ["student_course_enrollment_id"],
          },
          {
            name: "IDX_student_course_progress_step",
            columnNames: ["course_step_id"],
          },
          {
            name: "IDX_student_course_progress_session",
            columnNames: ["session_id"],
          },
        ],
      }),
      true,
    );

    // 5. Drop student_course_step_progress table
    await queryRunner.dropTable("student_course_step_progress", true);

    // 6. Remove course_program_id from package_allowance
    const packageAllowanceTable =
      await queryRunner.getTable("package_allowance");
    if (packageAllowanceTable) {
      const foreignKey = packageAllowanceTable.foreignKeys.find((fk) =>
        fk.columnNames.includes("course_program_id"),
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey("package_allowance", foreignKey);
      }

      const index = packageAllowanceTable.indices.find(
        (idx) => idx.name === "IDX_package_allowance_course_program",
      );
      if (index) {
        await queryRunner.dropIndex("package_allowance", index);
      }

      await queryRunner.dropColumn("package_allowance", "course_program_id");
    }
  }
}
