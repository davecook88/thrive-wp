import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
  TableForeignKey,
} from "typeorm";

export class AddCourseCohorts1765000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create course_cohort table
    await queryRunner.createTable(
      new Table({
        name: "course_cohort",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "course_program_id",
            type: "int",
            isNullable: false,
            comment: "FK to course_program.id",
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: false,
            comment: 'Cohort display name (e.g., "Fall 2025 Cohort")',
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
            comment: "Optional cohort-specific description",
          },
          {
            name: "start_date",
            type: "date",
            isNullable: false,
            comment: "First session date of cohort",
          },
          {
            name: "end_date",
            type: "date",
            isNullable: false,
            comment: "Last session date of cohort",
          },
          {
            name: "timezone",
            type: "varchar",
            length: "64",
            isNullable: false,
            default: "'America/New_York'",
            comment: "Timezone for cohort (inherits from course by default)",
          },
          {
            name: "max_enrollment",
            type: "smallint",
            isNullable: false,
            unsigned: true,
            comment: "Maximum students allowed in cohort",
          },
          {
            name: "current_enrollment",
            type: "smallint",
            isNullable: false,
            unsigned: true,
            default: 0,
            comment: "Current enrolled count (updated on enrollment)",
          },
          {
            name: "enrollment_deadline",
            type: "datetime",
            precision: 3,
            isNullable: true,
            comment:
              "Last datetime student can enroll (defaults to start_date)",
          },
          {
            name: "is_active",
            type: "tinyint",
            width: 1,
            isNullable: false,
            default: 1,
            comment: "Whether cohort is available for enrollment",
          },
          {
            name: "created_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
            isNullable: false,
            comment: "Record creation timestamp in UTC",
          },
          {
            name: "updated_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
            onUpdate: "CURRENT_TIMESTAMP(3)",
            isNullable: false,
            comment: "Record last update timestamp in UTC",
          },
          {
            name: "deleted_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
            comment: "Soft delete timestamp in UTC",
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
            name: "IDX_course_cohort_course_program_id",
            columnNames: ["course_program_id"],
          },
          {
            name: "IDX_course_cohort_start_date",
            columnNames: ["start_date"],
          },
          {
            name: "IDX_course_cohort_is_active",
            columnNames: ["is_active"],
          },
          {
            name: "UQ_course_cohort_name",
            columnNames: ["course_program_id", "name"],
            isUnique: true,
          },
        ],
      }),
      true,
    );

    // Add CHECK constraints for data integrity
    await queryRunner.query(`
      ALTER TABLE course_cohort
      ADD CONSTRAINT chk_enrollment_capacity
      CHECK (current_enrollment <= max_enrollment)
    `);

    await queryRunner.query(`
      ALTER TABLE course_cohort
      ADD CONSTRAINT chk_date_order
      CHECK (end_date >= start_date)
    `);

    // 2. Create course_cohort_session table
    await queryRunner.createTable(
      new Table({
        name: "course_cohort_session",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "cohort_id",
            type: "int",
            isNullable: false,
            comment: "FK to course_cohort.id",
          },
          {
            name: "course_step_id",
            type: "int",
            isNullable: false,
            comment: "FK to course_step.id",
          },
          {
            name: "course_step_option_id",
            type: "int",
            isNullable: false,
            comment: "FK to course_step_option.id",
          },
          {
            name: "created_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
            isNullable: false,
            comment: "Record creation timestamp in UTC",
          },
          {
            name: "updated_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
            onUpdate: "CURRENT_TIMESTAMP(3)",
            isNullable: false,
            comment: "Record last update timestamp in UTC",
          },
          {
            name: "deleted_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
            comment: "Soft delete timestamp in UTC",
          },
        ],
        foreignKeys: [
          {
            columnNames: ["cohort_id"],
            referencedTableName: "course_cohort",
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
            columnNames: ["course_step_option_id"],
            referencedTableName: "course_step_option",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
        indices: [
          {
            name: "UQ_cohort_step_option",
            columnNames: [
              "cohort_id",
              "course_step_id",
              "course_step_option_id",
            ],
            isUnique: true,
          },
          {
            name: "IDX_course_cohort_session_cohort_id",
            columnNames: ["cohort_id"],
          },
          {
            name: "IDX_course_cohort_session_option_id",
            columnNames: ["course_step_option_id"],
          },
        ],
      }),
      true,
    );

    // 3. Add hero_image_url and slug to course_program
    await queryRunner.addColumn(
      "course_program",
      new TableColumn({
        name: "hero_image_url",
        type: "varchar",
        length: "512",
        isNullable: true,
        comment: "URL to course hero image (placeholder support)",
      }),
    );

    await queryRunner.addColumn(
      "course_program",
      new TableColumn({
        name: "slug",
        type: "varchar",
        length: "100",
        isNullable: true,
        isUnique: true,
        comment: "URL-friendly slug (future migration from code-based URLs)",
      }),
    );

    // 4. Add cohort_id to student_course_step_progress
    await queryRunner.addColumn(
      "student_course_step_progress",
      new TableColumn({
        name: "cohort_id",
        type: "int",
        isNullable: true,
        comment:
          "Which cohort student enrolled in (null for legacy enrollments)",
      }),
    );

    await queryRunner.createIndex(
      "student_course_step_progress",
      new TableIndex({
        name: "IDX_student_course_step_progress_cohort_id",
        columnNames: ["cohort_id"],
      }),
    );

    await queryRunner.createForeignKey(
      "student_course_step_progress",
      new TableForeignKey({
        columnNames: ["cohort_id"],
        referencedTableName: "course_cohort",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse operations in opposite order

    // 4. Remove cohort_id from student_course_step_progress
    const progressTable = await queryRunner.getTable(
      "student_course_step_progress",
    );
    const cohortFk = progressTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf("cohort_id") !== -1,
    );
    if (cohortFk) {
      await queryRunner.dropForeignKey(
        "student_course_step_progress",
        cohortFk,
      );
    }

    await queryRunner.dropIndex(
      "student_course_step_progress",
      "IDX_student_course_step_progress_cohort_id",
    );
    await queryRunner.dropColumn("student_course_step_progress", "cohort_id");

    // 3. Remove hero_image_url and slug from course_program
    await queryRunner.dropColumn("course_program", "slug");
    await queryRunner.dropColumn("course_program", "hero_image_url");

    // 2. Drop course_cohort_session table
    await queryRunner.dropTable("course_cohort_session");

    // 1. Drop course_cohort table (constraints dropped automatically)
    await queryRunner.dropTable("course_cohort");
  }
}
