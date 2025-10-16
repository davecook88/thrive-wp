import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add scheduling and classes tables: course, session, booking, course_enrollment, course_teacher
 * Implements the schema for PRIVATE, GROUP, and COURSE session types with proper relations and constraints.
 */
export class AddSchedulingTables1756431459157 implements MigrationInterface {
  name = "AddSchedulingTables1756431459157";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create course table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS course (
        id int NOT NULL AUTO_INCREMENT,
        slug varchar(191) NOT NULL COMMENT 'Human-friendly identifier',
        title varchar(255) NOT NULL COMMENT 'Course title',
        description text NULL COMMENT 'Course description',
        is_active tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the course is active',
        enrollment_opens_at datetime(3) NULL COMMENT 'When enrollment opens (UTC)',
        enrollment_closes_at datetime(3) NULL COMMENT 'When enrollment closes (UTC)',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_course_slug_unique (slug),
        KEY IDX_course_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create session table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS session (
        id int NOT NULL AUTO_INCREMENT,
        type enum('PRIVATE','GROUP','COURSE') NOT NULL COMMENT 'Type of session',
        course_id int NULL COMMENT 'FK to course.id (set for course sessions)',
        teacher_id int NOT NULL COMMENT 'FK to teacher.id',
        created_from_availability_id int NULL COMMENT 'FK to teacher_availability.id (optional)',
        start_at datetime(3) NOT NULL COMMENT 'Session start time (UTC)',
        end_at datetime(3) NOT NULL COMMENT 'Session end time (UTC)',
        capacity_max smallint unsigned NOT NULL DEFAULT 1 COMMENT 'Maximum number of participants',
        status enum('SCHEDULED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED' COMMENT 'Session status',
        visibility enum('PUBLIC','PRIVATE','HIDDEN') NOT NULL DEFAULT 'PUBLIC' COMMENT 'Session visibility level',
        requires_enrollment tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether enrollment is required for course sessions',
        meeting_url varchar(500) NULL COMMENT 'Join link for the meeting',
        source_timezone varchar(64) NULL COMMENT 'Original timezone of the creator',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        KEY IDX_session_teacher_time (teacher_id, start_at),
        KEY IDX_session_course_time (course_id, start_at),
        KEY IDX_session_time (start_at),
        CONSTRAINT FK_session_teacher FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE RESTRICT,
        CONSTRAINT FK_session_course FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE SET NULL,
        CONSTRAINT FK_session_created_from_availability FOREIGN KEY (created_from_availability_id) REFERENCES teacher_availability(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create booking table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking (
        id int NOT NULL AUTO_INCREMENT,
        session_id int NOT NULL COMMENT 'FK to session.id',
        student_id int NOT NULL COMMENT 'FK to student.id',
        status enum('INVITED','CONFIRMED','CANCELLED','NO_SHOW','FORFEIT') NOT NULL DEFAULT 'CONFIRMED' COMMENT 'Booking status',
        cancelled_at datetime(3) NULL COMMENT 'Cancellation timestamp (UTC)',
        cancellation_reason varchar(500) NULL COMMENT 'Reason for cancellation',
        invited_at datetime(3) NULL COMMENT 'Invitation timestamp (UTC)',
        accepted_at datetime(3) NULL COMMENT 'Acceptance timestamp (UTC)',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_booking_student_session (session_id, student_id),
        KEY IDX_booking_session (session_id),
        KEY IDX_booking_student (student_id),
        CONSTRAINT FK_booking_session FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE,
        CONSTRAINT FK_booking_student FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create course_enrollment table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS course_enrollment (
        id int NOT NULL AUTO_INCREMENT,
        course_id int NOT NULL COMMENT 'FK to course.id',
        student_id int NOT NULL COMMENT 'FK to student.id',
        status enum('ACTIVE','CANCELLED','COMPLETED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Enrollment status',
        enrolled_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Enrollment timestamp (UTC)',
        cancelled_at datetime(3) NULL COMMENT 'Cancellation timestamp (UTC)',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_course_enrollment (course_id, student_id),
        KEY IDX_course_enrollment_course (course_id),
        KEY IDX_course_enrollment_student (student_id),
        CONSTRAINT FK_course_enrollment_course FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
        CONSTRAINT FK_course_enrollment_student FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create course_teacher table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS course_teacher (
        id int NOT NULL AUTO_INCREMENT,
        course_id int NOT NULL COMMENT 'FK to course.id',
        teacher_id int NOT NULL COMMENT 'FK to teacher.id',
        role enum('LEAD','ASSISTANT') NOT NULL DEFAULT 'LEAD' COMMENT 'Role of the teacher in the course',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_course_teacher (course_id, teacher_id),
        KEY IDX_course_teacher_course (course_id),
        KEY IDX_course_teacher_teacher (teacher_id),
        CONSTRAINT FK_course_teacher_course FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
        CONSTRAINT FK_course_teacher_teacher FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to handle foreign keys
    await queryRunner.query("DROP TABLE IF EXISTS course_teacher;");
    await queryRunner.query("DROP TABLE IF EXISTS course_enrollment;");
    await queryRunner.query("DROP TABLE IF EXISTS booking;");
    await queryRunner.query("DROP TABLE IF EXISTS session;");
    await queryRunner.query("DROP TABLE IF EXISTS course;");
  }
}
