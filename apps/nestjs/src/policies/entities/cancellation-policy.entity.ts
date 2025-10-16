import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";

/**
 * Penalty types for late cancellations or no-shows
 */
export enum PenaltyType {
  /** No penalty applied */
  NONE = "NONE",
  /** Student loses the credit/package session */
  CREDIT_LOSS = "CREDIT_LOSS",
  /** Student is charged a fee (future implementation) */
  FEE = "FEE",
}

/**
 * CancellationPolicy entity defines rules for student booking modifications.
 * Only one policy should be active at a time.
 */
@Entity("cancellation_policy")
export class CancellationPolicy extends BaseEntity {
  @Column({
    name: "allow_cancellation",
    type: "boolean",
    default: true,
    comment: "Whether students can cancel bookings",
  })
  allowCancellation: boolean;

  @Column({
    name: "cancellation_deadline_hours",
    type: "int",
    default: 24,
    comment: "Hours before session start that cancellation is allowed",
  })
  cancellationDeadlineHours: number;

  @Column({
    name: "allow_rescheduling",
    type: "boolean",
    default: true,
    comment: "Whether students can reschedule bookings",
  })
  allowRescheduling: boolean;

  @Column({
    name: "rescheduling_deadline_hours",
    type: "int",
    default: 24,
    comment: "Hours before session start that rescheduling is allowed",
  })
  reschedulingDeadlineHours: number;

  @Column({
    name: "max_reschedules_per_booking",
    type: "int",
    default: 2,
    comment: "Maximum number of times a booking can be rescheduled",
  })
  maxReschedulesPerBooking: number;

  @Column({
    name: "penalty_type",
    type: "enum",
    enum: PenaltyType,
    default: PenaltyType.NONE,
    comment: "Type of penalty for late cancellations",
  })
  penaltyType: PenaltyType;

  @Column({
    name: "refund_credits_on_cancel",
    type: "boolean",
    default: true,
    comment: "Whether to refund package credits when student cancels",
  })
  refundCreditsOnCancel: boolean;

  @Column({
    name: "is_active",
    type: "boolean",
    default: true,
    comment: "Whether this policy is currently active",
  })
  isActive: boolean;

  @Column({
    name: "policy_name",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "Descriptive name for this policy version",
  })
  policyName: string | null;
}
