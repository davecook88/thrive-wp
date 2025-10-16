import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCourseProgramsTables1760000000000
  implements MigrationInterface
{
  name = "AddCourseProgramsTables1760000000000";
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create course_program table
    await queryRunner.query(`
      CREATE TABLE course_program (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        timezone VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        stripe_product_id VARCHAR(255) NULL,
        stripe_price_id VARCHAR(255) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        INDEX idx_course_program_code (code),
        INDEX idx_course_program_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create course_step table
    await queryRunner.query(`
      CREATE TABLE course_step (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_program_id INT NOT NULL,
        step_order SMALLINT UNSIGNED NOT NULL,
        label VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        is_required TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (course_program_id) REFERENCES course_program(id) ON DELETE CASCADE,
        INDEX idx_course_step_program_order (course_program_id, step_order),
        UNIQUE KEY idx_course_step_program_label (course_program_id, label)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create course_bundle_component table
    await queryRunner.query(`
      CREATE TABLE course_bundle_component (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_program_id INT NOT NULL,
        component_type ENUM('PRIVATE_CREDIT', 'GROUP_CREDIT') NOT NULL,
        quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
        description VARCHAR(255) NULL,
        metadata JSON NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (course_program_id) REFERENCES course_program(id) ON DELETE CASCADE,
        INDEX idx_course_bundle_program (course_program_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create course_step_option table
    await queryRunner.query(`
      CREATE TABLE course_step_option (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_step_id INT NOT NULL,
        group_class_id INT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (course_step_id) REFERENCES course_step(id) ON DELETE CASCADE,
        FOREIGN KEY (group_class_id) REFERENCES group_class(id) ON DELETE CASCADE,
        UNIQUE KEY idx_course_step_option_unique (course_step_id, group_class_id),
        INDEX idx_course_step_option_step (course_step_id),
        INDEX idx_course_step_option_class (group_class_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create student_course_enrollment table
    await queryRunner.query(`
      CREATE TABLE student_course_enrollment (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_program_id INT NOT NULL,
        student_id INT NOT NULL,
        stripe_payment_intent_id VARCHAR(255) NOT NULL,
        stripe_product_id VARCHAR(255) NOT NULL,
        stripe_price_id VARCHAR(255) NOT NULL,
        status ENUM('ACTIVE', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'ACTIVE',
        purchased_at DATETIME(3) NOT NULL,
        cancelled_at DATETIME(3) NULL,
        refunded_at DATETIME(3) NULL,
        metadata JSON NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (course_program_id) REFERENCES course_program(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
        UNIQUE KEY idx_student_course_enrollment_unique (course_program_id, student_id),
        INDEX idx_student_course_enrollment_student (student_id),
        INDEX idx_student_course_enrollment_payment (stripe_payment_intent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create student_course_progress table
    await queryRunner.query(`
      CREATE TABLE student_course_progress (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_course_enrollment_id INT NOT NULL,
        course_step_id INT NOT NULL,
        selected_option_id INT NULL,
        status ENUM('UNBOOKED', 'BOOKED', 'COMPLETED', 'MISSED', 'CANCELLED') NOT NULL DEFAULT 'UNBOOKED',
        booked_at DATETIME(3) NULL,
        completed_at DATETIME(3) NULL,
        cancelled_at DATETIME(3) NULL,
        session_id INT NULL,
        credit_consumed TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (student_course_enrollment_id) REFERENCES student_course_enrollment(id) ON DELETE CASCADE,
        FOREIGN KEY (course_step_id) REFERENCES course_step(id) ON DELETE CASCADE,
        FOREIGN KEY (selected_option_id) REFERENCES course_step_option(id) ON DELETE SET NULL,
        FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE SET NULL,
        UNIQUE KEY idx_student_course_progress_unique (student_course_enrollment_id, course_step_id),
        INDEX idx_student_course_progress_enrollment (student_course_enrollment_id),
        INDEX idx_student_course_progress_step (course_step_id),
        INDEX idx_student_course_progress_session (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to avoid FK constraint issues
    await queryRunner.query("DROP TABLE IF EXISTS student_course_progress");
    await queryRunner.query("DROP TABLE IF EXISTS student_course_enrollment");
    await queryRunner.query("DROP TABLE IF EXISTS course_step_option");
    await queryRunner.query("DROP TABLE IF EXISTS course_bundle_component");
    await queryRunner.query("DROP TABLE IF EXISTS course_step");
    await queryRunner.query("DROP TABLE IF EXISTS course_program");
  }
}
