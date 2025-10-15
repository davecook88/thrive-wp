import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { Course } from "../../courses/entities/course.entity.js";
import type { Student } from "../../students/entities/student.entity.js";

/**
 * Enumeration of course enrollment statuses.
 */
export enum CourseEnrollmentStatus {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

/**
 * CourseEnrollment entity represents enrollment to a course, independent of specific sessions.
 */
@Entity("course_enrollment")
@Unique(["courseId", "studentId"])
@Index(["courseId"])
@Index(["studentId"])
export class CourseEnrollment extends BaseEntity {
  @Column({
    name: "course_id",
    type: "int",
    comment: "FK to course.id",
  })
  courseId: number;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course: Course;

  @Column({
    name: "student_id",
    type: "int",
    comment: "FK to student.id",
  })
  studentId: number;

  @ManyToOne("Student", { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_id" })
  student: Student;

  @Column({
    name: "status",
    type: "enum",
    enum: CourseEnrollmentStatus,
    default: CourseEnrollmentStatus.ACTIVE,
    comment: "Enrollment status",
  })
  status: CourseEnrollmentStatus;

  @Column({
    name: "enrolled_at",
    type: "datetime",
    precision: 3,
    default: () => "CURRENT_TIMESTAMP(3)",
    comment: "Enrollment timestamp (UTC)",
  })
  enrolledAt: Date;

  @Column({
    name: "cancelled_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "Cancellation timestamp (UTC)",
  })
  cancelledAt: Date | null;
}
