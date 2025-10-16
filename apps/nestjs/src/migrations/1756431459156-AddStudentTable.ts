import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add student table for student profiles.
 * Creates student table with one-to-one relationship to user.
 * Includes a trigger to auto-create student record when user is inserted.
 */
export class AddStudentTable1756431459156 implements MigrationInterface {
  name = "AddStudentTable1756431459156";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student (
        id int NOT NULL AUTO_INCREMENT,
        user_id int NOT NULL COMMENT 'FK to user.id (unique 1:1 with user)',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_student_user_id_unique (user_id),
        CONSTRAINT FK_student_user_id FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create trigger to auto-insert student record when user is inserted
    await queryRunner.query(`
      CREATE TRIGGER IF NOT EXISTS create_student_on_user_insert
      AFTER INSERT ON user
      FOR EACH ROW
      BEGIN
        INSERT INTO student (user_id, created_at, updated_at)
        VALUES (NEW.id, NEW.created_at, NEW.created_at);
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger first
    await queryRunner.query(
      "DROP TRIGGER IF EXISTS create_student_on_user_insert;",
    );
    await queryRunner.query("DROP TABLE IF EXISTS student;");
  }
}
