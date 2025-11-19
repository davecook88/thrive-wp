import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { CourseProgram } from "./course-program.entity.js";
import type { CourseCohortSession } from "./course-cohort-session.entity.js";
import type { StudentCourseStepProgress } from "./student-course-step-progress.entity.js";

/**
 * CourseCohort entity represents a pre-packaged set of sessions for a course program.
 *
 * A cohort is a specific offering of a course with:
 * - Pre-selected sessions for each course step
 * - Maximum enrollment capacity
 * - Enrollment deadline
 *
 * Start and end dates are dynamically calculated from the assigned sessions.
 *
 * Students enroll in a cohort (not individual sessions), which simplifies:
 * - Student decision-making
 * - Session booking (auto-book single-option steps)
 * - Capacity management
 * - Marketing ("Next cohort starts...")
 */
@Entity("course_cohort")
@Index(["courseProgramId"])
@Index(["isActive"])
@Index(["courseProgramId", "name"], { unique: true })
export class CourseCohort extends BaseEntity {
  @Column({ name: "course_program_id", type: "int" })
  courseProgramId: number;

  @ManyToOne(() => CourseProgram, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_program_id" })
  courseProgram: CourseProgram;

  @Column({
    name: "name",
    type: "varchar",
    length: 255,
    comment: 'Cohort display name (e.g., "Fall 2025 Cohort")',
  })
  name: string;

  @Column({
    name: "description",
    type: "text",
    nullable: true,
    comment: "Optional cohort-specific description",
  })
  description: string | null;

  @Column({
    name: "max_enrollment",
    type: "smallint",
    unsigned: true,
    comment: "Maximum students allowed in cohort",
  })
  maxEnrollment: number;

  @Column({
    name: "current_enrollment",
    type: "smallint",
    unsigned: true,
    default: 0,
    comment: "Current enrolled count (updated on enrollment)",
  })
  currentEnrollment: number;

  @Column({
    name: "enrollment_deadline",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "Last datetime student can enroll (defaults to start_date)",
  })
  enrollmentDeadline: Date | null;

  @Column({
    name: "is_active",
    type: "tinyint",
    width: 1,
    default: 1,
    comment: "Whether cohort is available for enrollment",
  })
  isActive: boolean;

  @OneToMany("CourseCohortSession", "cohort")
  cohortSessions: CourseCohortSession[];

  @OneToMany("StudentCourseStepProgress", "cohort")
  studentProgress: StudentCourseStepProgress[];
}
