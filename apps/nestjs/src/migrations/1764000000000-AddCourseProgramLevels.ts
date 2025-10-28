import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AddCourseProgramLevels1764000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create course_program_level junction table
    await queryRunner.createTable(
      new Table({
        name: "course_program_level",
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
            comment: "FK to course_program.id",
          },
          {
            name: "level_id",
            type: "int",
            comment: "FK to level.id",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
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
            columnNames: ["level_id"],
            referencedTableName: "level",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
      true,
    );

    // Add unique index to prevent duplicate level assignments
    await queryRunner.createIndex(
      "course_program_level",
      new TableIndex({
        name: "UQ_course_program_level",
        columnNames: ["course_program_id", "level_id"],
        isUnique: true,
      }),
    );

    // Add index for faster queries
    await queryRunner.createIndex(
      "course_program_level",
      new TableIndex({
        name: "IDX_course_program_level_course",
        columnNames: ["course_program_id"],
      }),
    );

    await queryRunner.createIndex(
      "course_program_level",
      new TableIndex({
        name: "IDX_course_program_level_level",
        columnNames: ["level_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("course_program_level");
  }
}
