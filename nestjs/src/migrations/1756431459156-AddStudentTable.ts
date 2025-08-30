import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add student table for student profiles.
 * Creates student table with one-to-one relationship to user.
 * Includes a trigger to auto-create student record when user is inserted.
 */
export class AddStudentTable1756431459156 implements MigrationInterface {
  name = 'AddStudentTable1756431459156';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS student (
        id int NOT NULL AUTO_INCREMENT,
        userId int NOT NULL COMMENT 'FK to user.id (unique 1:1 with user)',
        createdAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updatedAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deletedAt datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_student_userId_unique (userId),
        CONSTRAINT FK_student_userId FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create trigger to auto-insert student record when user is inserted
    await queryRunner.query(`
      CREATE TRIGGER IF NOT EXISTS create_student_on_user_insert
      AFTER INSERT ON user
      FOR EACH ROW
      BEGIN
        INSERT INTO student (userId, createdAt, updatedAt)
        VALUES (NEW.id, NEW.createdAt, NEW.createdAt);
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger first
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS create_student_on_user_insert;',
    );
    await queryRunner.query('DROP TABLE IF EXISTS student;');
  }
}
