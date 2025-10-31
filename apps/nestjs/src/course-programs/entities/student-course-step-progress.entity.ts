import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { StudentPackage } from "../../packages/entities/student-package.entity.js";
import { CourseStep } from "./course-step.entity.js";
import type { CourseCohort } from "./course-cohort.entity.js";

/**
 * StudentCourseStepProgress tracks a student's progress through individual course steps.
 *
 * This is a lightweight entity that links:
 * - StudentPackage (the course purchase/enrollment)
 * - CourseStep (which step in the course)
 * - Session (if the step has been booked)
 *
 * Key differences from the old system:
 * - Links to StudentPackage instead of StudentCourseEnrollment
 * - Does NOT create PackageUse records (courses use enrollment-based access)
 * - Seeded automatically when a course package is purchased
 *
 * Status flow:
 * UNBOOKED → BOOKED → COMPLETED (or MISSED/CANCELLED)
 */
@Entity("student_course_step_progress")
@Index(["studentPackageId"])
@Index(["courseStepId"])
@Index(["cohortId"])
@Index(["studentPackageId", "courseStepId"], { unique: true })
export class StudentCourseStepProgress extends BaseEntity {
  @Column({ name: "student_package_id", type: "int" })
  studentPackageId: number;

  @ManyToOne(() => StudentPackage, {
    onDelete: "CASCADE",
    eager: false,
  })
  @JoinColumn({ name: "student_package_id" })
  studentPackage: StudentPackage;

  @Column({ name: "course_step_id", type: "int" })
  courseStepId: number;

  @ManyToOne(() => CourseStep, {
    onDelete: "CASCADE",
    eager: false,
  })
  @JoinColumn({ name: "course_step_id" })
  courseStep: CourseStep;

  @Column({
    name: "status",
    type: "enum",
    enum: ["UNBOOKED", "BOOKED", "COMPLETED", "MISSED", "CANCELLED"],
    default: "UNBOOKED",
  })
  status: "UNBOOKED" | "BOOKED" | "COMPLETED" | "MISSED" | "CANCELLED";

  @Column({ name: "session_id", type: "int", nullable: true })
  sessionId?: number;

  // Note: Session relation is intentionally not defined to avoid circular dependency
  // Can be queried via sessionId when needed

  @Column({ name: "booked_at", type: "datetime", precision: 3, nullable: true })
  bookedAt?: Date;

  @Column({
    name: "completed_at",
    type: "datetime",
    precision: 3,
    nullable: true,
  })
  completedAt?: Date;

  @Column({
    name: "cohort_id",
    type: "int",
    nullable: true,
    comment: "Which cohort student enrolled in (null for legacy enrollments)",
  })
  cohortId?: number;

  @ManyToOne("CourseCohort", {
    onDelete: "SET NULL",
    eager: false,
  })
  @JoinColumn({ name: "cohort_id" })
  cohort?: CourseCohort;
}
