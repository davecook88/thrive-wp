import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { StudentCourseEnrollment } from "./student-course-enrollment.entity.js";
import { CourseStep } from "./course-step.entity.js";
import { CourseStepOption } from "./course-step-option.entity.js";
import { Session } from "../../sessions/entities/session.entity.js";

/**
 * Enumeration of course progress statuses.
 */
export enum StudentCourseProgressStatus {
  UNBOOKED = "UNBOOKED",
  BOOKED = "BOOKED",
  COMPLETED = "COMPLETED",
  MISSED = "MISSED",
  CANCELLED = "CANCELLED",
}

/**
 * StudentCourseProgress entity tracks student progress through course steps.
 * Records booking status, completion, and credit consumption.
 */
@Entity("student_course_progress")
@Unique(["studentCourseEnrollmentId", "courseStepId"])
@Index(["studentCourseEnrollmentId"])
@Index(["courseStepId"])
@Index(["sessionId"])
export class StudentCourseProgress extends BaseEntity {
  @Column({
    name: "student_course_enrollment_id",
    type: "int",
    comment: "FK to student_course_enrollment.id",
  })
  studentCourseEnrollmentId: number;

  @ManyToOne(() => StudentCourseEnrollment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_course_enrollment_id" })
  studentCourseEnrollment: StudentCourseEnrollment;

  @Column({
    name: "course_step_id",
    type: "int",
    comment: "FK to course_step.id",
  })
  courseStepId: number;

  @ManyToOne(() => CourseStep, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_step_id" })
  courseStep: CourseStep;

  @Column({
    name: "selected_option_id",
    type: "int",
    nullable: true,
    comment: "FK to course_step_option.id (chosen class option)",
  })
  selectedOptionId: number | null;

  @ManyToOne(() => CourseStepOption, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "selected_option_id" })
  selectedOption: CourseStepOption | null;

  @Column({
    name: "status",
    type: "enum",
    enum: StudentCourseProgressStatus,
    default: StudentCourseProgressStatus.UNBOOKED,
    comment: "Progress status",
  })
  status: StudentCourseProgressStatus;

  @Column({
    name: "booked_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "When student booked this step",
  })
  bookedAt: Date | null;

  @Column({
    name: "completed_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "When step was completed",
  })
  completedAt: Date | null;

  @Column({
    name: "cancelled_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "When booking was cancelled",
  })
  cancelledAt: Date | null;

  @Column({
    name: "session_id",
    type: "int",
    nullable: true,
    comment: "FK to session.id (actual booked session)",
  })
  sessionId: number | null;

  @ManyToOne(() => Session, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "session_id" })
  session: Session | null;

  @Column({
    name: "credit_consumed",
    type: "tinyint",
    width: 1,
    default: () => "0",
    comment: "Whether course entitlement was used",
  })
  creditConsumed: boolean;
}
