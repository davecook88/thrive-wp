import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveLegacyCourseTables1762000000050 implements MigrationInterface {
  name = "RemoveLegacyCourseTables1762000000050";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Must remove session.course_id foreign key FIRST before dropping course table
    // Otherwise we'll get FK constraint violation
    const sessionTable = await queryRunner.getTable("session");
    if (sessionTable) {
      const courseIdColumn = sessionTable.findColumnByName("course_id");
      if (courseIdColumn) {
        // Drop the foreign key first
        const foreignKey = sessionTable.foreignKeys.find(
          (fk) => fk.columnNames.includes("course_id")
        );
        if (foreignKey) {
          await queryRunner.dropForeignKey("session", foreignKey);
        }
        // Drop the index
        const index = sessionTable.indices.find(
          (idx) => idx.columnNames.includes("course_id")
        );
        if (index) {
          await queryRunner.dropIndex("session", index);
        }
        // Drop the column
        await queryRunner.dropColumn("session", "course_id");
      }
    }

    // Now drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS course_enrollment`);
    await queryRunner.query(`DROP TABLE IF EXISTS course_teacher`);
    await queryRunner.query(`DROP TABLE IF EXISTS course`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate course table
    await queryRunner.query(`
      CREATE TABLE course (
        id INT PRIMARY KEY AUTO_INCREMENT,
        slug VARCHAR(191) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        enrollment_opens_at DATETIME(3) NULL,
        enrollment_closes_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        INDEX idx_course_slug (slug),
        INDEX idx_course_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Recreate course_teacher table
    await queryRunner.query(`
      CREATE TABLE course_teacher (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_id INT NOT NULL,
        teacher_id INT NOT NULL,
        role VARCHAR(100) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE CASCADE,
        UNIQUE KEY idx_course_teacher_unique (course_id, teacher_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Recreate course_enrollment table
    await queryRunner.query(`
      CREATE TABLE course_enrollment (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_id INT NOT NULL,
        student_id INT NOT NULL,
        status ENUM('ACTIVE', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
        enrolled_at DATETIME(3) NOT NULL,
        completed_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
        UNIQUE KEY idx_course_enrollment_unique (course_id, student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Restore session.course_id column
    await queryRunner.query(`
      ALTER TABLE session
      ADD COLUMN course_id INT NULL
      COMMENT 'FK to course.id (if session belongs to a course)'
    `);
    await queryRunner.query(`
      ALTER TABLE session
      ADD CONSTRAINT FK_session_course
      FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_session_course_id ON session(course_id, start_at)
    `);
  }
}
