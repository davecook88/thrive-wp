import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import type { Session } from "@/sessions/entities/session.entity.js";
import type { Student } from "@/students/entities/student.entity.js";

/**
 * Enumeration of booking statuses.
 */
export enum BookingStatus {
  /** Student has been invited to the session but has not yet accepted */
  INVITED = "INVITED",

  /** Student has confirmed their attendance (either accepted invitation or completed payment) */
  CONFIRMED = "CONFIRMED",

  /** Booking was cancelled by student or admin */
  CANCELLED = "CANCELLED",

  /** Student did not attend a confirmed session */
  NO_SHOW = "NO_SHOW",

  /** Student forfeited their spot (e.g., late cancellation with penalty) */
  FORFEIT = "FORFEIT",

  /** Booking created but awaiting payment confirmation from Stripe webhook */
  PENDING = "PENDING",

  /**
   * @deprecated Never actually created in codebase; use PENDING instead
   */
  DRAFT = "DRAFT",
}

/**
 * Booking entity represents a student's seat in a session.
 */
@Entity("booking")
@Unique(["sessionId", "studentId"])
@Index(["sessionId"])
@Index(["studentId"])
export class Booking extends BaseEntity {
  @Column({
    name: "session_id",
    type: "int",
    comment: "FK to session.id",
  })
  sessionId: number;

  @ManyToOne("Session", (session: Session) => session.bookings, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "session_id" })
  session: Session;

  @Column({
    name: "student_id",
    type: "int",
    comment: "FK to student.id",
  })
  studentId: number;

  @ManyToOne("Student", (student: Student) => student.bookings, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "student_id" })
  student: Student;

  @Column({
    name: "status",
    type: "enum",
    enum: BookingStatus,
    default: BookingStatus.CONFIRMED,
    comment: "Booking status",
  })
  status: BookingStatus;

  @Column({
    name: "cancelled_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "Cancellation timestamp (UTC)",
  })
  cancelledAt: Date | null;

  @Column({
    name: "cancellation_reason",
    type: "varchar",
    length: 500,
    nullable: true,
    comment: "Reason for cancellation",
  })
  cancellationReason: string | null;

  @Column({
    name: "invited_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "Invitation timestamp (UTC)",
  })
  invitedAt: Date | null;

  @Column({
    name: "accepted_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "Acceptance timestamp (UTC)",
  })
  acceptedAt: Date | null;

  @Column({
    name: "student_package_id",
    type: "int",
    nullable: true,
    comment: "FK to student_package.id when booking consumed a package credit",
  })
  studentPackageId: number | null;

  @Column({
    name: "package_use_id",
    type: "int",
    nullable: true,
    comment:
      "FK to package_use.id - tracks which specific package use record this booking created",
  })
  packageUseId: number | null;

  @Column({
    name: "credits_cost",
    type: "int",
    nullable: true,
    comment: "How many credits this booking consumed from the package",
  })
  creditsCost: number | null;

  @Column({
    name: "rescheduled_count",
    type: "int",
    default: 0,
    comment: "Number of times this booking has been rescheduled",
  })
  rescheduledCount: number;

  @Column({
    name: "original_session_id",
    type: "int",
    nullable: true,
    comment:
      "Original session ID if this booking was rescheduled from another session",
  })
  originalSessionId: number | null;

  @Column({
    name: "cancelled_by_student",
    type: "boolean",
    default: false,
    comment: "Whether the booking was cancelled by the student (vs admin)",
  })
  cancelledByStudent: boolean;
}
