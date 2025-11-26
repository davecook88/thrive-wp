import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { Student } from "../../students/entities/student.entity.js";
import { Teacher } from "../../teachers/entities/teacher.entity.js";
import { CourseProgram } from "../../course-programs/entities/course-program.entity.js";
import { Admin } from "../../users/entities/admin.entity.js";

/**
 * Testimonial entity represents student reviews and feedback.
 *
 * A testimonial can be:
 * - Teacher-specific (links to a teacher)
 * - Course-specific (links to a course program)
 * - General/platform-wide (both teacher and course are null)
 *
 * Moderation workflow:
 * - All testimonials start as "pending"
 * - Admin reviews and approves/rejects
 * - Only "approved" testimonials appear publicly
 *
 * Eligibility (validated in service layer):
 * - Teacher testimonials: Student must have attended sessions with that teacher
 * - Course testimonials: Student must be enrolled in that course
 * - General testimonials: Student must have attended at least one session
 * - Students cannot submit duplicate testimonials for the same context
 */
@Entity("testimonial")
@Index(["studentId"])
@Index(["teacherId"])
@Index(["courseProgramId"])
@Index(["status"])
@Index(["isFeatured"])
@Index(["createdAt"])
export class Testimonial extends BaseEntity {
  // Author (required)
  @Column({
    name: "student_id",
    type: "int",
    comment: "FK to student.id - who wrote this testimonial",
  })
  studentId: number;

  @ManyToOne(() => Student, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "student_id" })
  student: Student;

  // Context: Teacher (optional - null if course or general testimonial)
  @Column({
    name: "teacher_id",
    type: "int",
    nullable: true,
    comment:
      "FK to teacher.id - if this is a teacher-specific testimonial (null otherwise)",
  })
  teacherId: number | null;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "teacher_id" })
  teacher?: Teacher;

  // Context: Course (optional - null if teacher or general testimonial)
  @Column({
    name: "course_program_id",
    type: "int",
    nullable: true,
    comment:
      "FK to course_program.id - if this is a course-specific testimonial (null otherwise)",
  })
  courseProgramId: number | null;

  @ManyToOne(() => CourseProgram, { onDelete: "CASCADE", eager: false })
  @JoinColumn({ name: "course_program_id" })
  courseProgram?: CourseProgram;

  // Content (required)
  @Column({
    name: "rating",
    type: "tinyint",
    unsigned: true,
    comment: "Star rating from 1 to 5 (required)",
  })
  rating: number;

  @Column({
    name: "comment",
    type: "text",
    nullable: true,
    comment:
      "Written review/feedback (optional, max 2000 chars enforced in DTO)",
  })
  comment: string | null;

  @Column({
    name: "tags",
    type: "text",
    nullable: true,
    comment: "JSON array of tags (e.g., ['conversation', 'beginner-friendly'])",
    transformer: {
      to: (value: string[] | null) => (value ? JSON.stringify(value) : null),
      from: (value: string | null) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as string[];
        } catch {
          return null;
        }
      },
    },
  })
  tags: string[] | null;

  // Moderation workflow
  @Column({
    name: "status",
    type: "enum",
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    comment: "Moderation status - only approved testimonials appear publicly",
  })
  status: "pending" | "approved" | "rejected";

  @Column({
    name: "admin_feedback",
    type: "text",
    nullable: true,
    comment:
      "Optional feedback from admin when approving; required when rejecting",
  })
  adminFeedback: string | null;

  @Column({
    name: "reviewed_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "Timestamp when admin reviewed this testimonial (UTC)",
  })
  reviewedAt: Date | null;

  @Column({
    name: "reviewed_by_admin_id",
    type: "int",
    nullable: true,
    comment: "FK to admin.id - which admin reviewed this",
  })
  reviewedByAdminId: number | null;

  @ManyToOne(() => Admin, { onDelete: "SET NULL", eager: false })
  @JoinColumn({ name: "reviewed_by_admin_id" })
  reviewedByAdmin?: Admin;

  // Display options
  @Column({
    name: "is_featured",
    type: "tinyint",
    width: 1,
    default: () => "0",
    comment: "Whether this testimonial should be highlighted/featured",
  })
  isFeatured: boolean;
}
