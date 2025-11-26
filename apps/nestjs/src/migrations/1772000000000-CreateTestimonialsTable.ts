import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTestimonialsTable1772000000000
  implements MigrationInterface
{
  name = "CreateTestimonialsTable1772000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS testimonial (
        id int NOT NULL AUTO_INCREMENT,
        student_id int NOT NULL COMMENT 'FK to student.id - who wrote this testimonial',
        teacher_id int NULL COMMENT 'FK to teacher.id - if this is a teacher-specific testimonial (null otherwise)',
        course_program_id int NULL COMMENT 'FK to course_program.id - if this is a course-specific testimonial (null otherwise)',
        rating tinyint UNSIGNED NOT NULL COMMENT 'Star rating from 1 to 5 (required)',
        comment text NULL COMMENT 'Written review/feedback (optional, max 2000 chars enforced in DTO)',
        tags text NULL COMMENT 'JSON array of tags (e.g., ["conversation", "beginner-friendly"])',
        status enum('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT 'Moderation status - only approved testimonials appear publicly',
        admin_feedback text NULL COMMENT 'Optional feedback from admin when approving; required when rejecting',
        reviewed_at datetime(3) NULL COMMENT 'Timestamp when admin reviewed this testimonial (UTC)',
        reviewed_by_admin_id int NULL COMMENT 'FK to admin.id - which admin reviewed this',
        is_featured tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this testimonial should be highlighted/featured',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        KEY IDX_testimonial_student (student_id),
        KEY IDX_testimonial_teacher (teacher_id),
        KEY IDX_testimonial_course_program (course_program_id),
        KEY IDX_testimonial_status (status),
        KEY IDX_testimonial_is_featured (is_featured),
        KEY IDX_testimonial_created_at (created_at),
        UNIQUE KEY UQ_testimonial_student_teacher (student_id, teacher_id) COMMENT 'Prevent duplicate reviews for same student-teacher pair',
        UNIQUE KEY UQ_testimonial_student_course (student_id, course_program_id) COMMENT 'Prevent duplicate reviews for same student-course pair',
        CONSTRAINT FK_testimonial_student FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
        CONSTRAINT FK_testimonial_teacher FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE CASCADE,
        CONSTRAINT FK_testimonial_course_program FOREIGN KEY (course_program_id) REFERENCES course_program(id) ON DELETE CASCADE,
        CONSTRAINT FK_testimonial_reviewed_by_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES admin(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Student testimonials/reviews for teachers, courses, or platform';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS testimonial;");
  }
}
