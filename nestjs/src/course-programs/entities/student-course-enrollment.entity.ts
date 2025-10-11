import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { CourseProgram } from './course-program.entity.js';
import { Student } from '../../students/entities/student.entity.js';
import type { StudentCourseProgress } from './student-course-progress.entity.js';

/**
 * Enumeration of course enrollment statuses.
 */
export enum StudentCourseEnrollmentStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * StudentCourseEnrollment entity tracks student purchases of course programs.
 * Links students to course programs with Stripe fulfillment tracking.
 */
@Entity('student_course_enrollment')
@Unique(['courseProgramId', 'studentId'])
@Index(['courseProgramId'])
@Index(['studentId'])
@Index(['stripePaymentIntentId'])
export class StudentCourseEnrollment extends BaseEntity {
  @Column({
    name: 'course_program_id',
    type: 'int',
    comment: 'FK to course_program.id',
  })
  courseProgramId: number;

  @ManyToOne(() => CourseProgram, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_program_id' })
  courseProgram: CourseProgram;

  @Column({
    name: 'student_id',
    type: 'int',
    comment: 'FK to student.id',
  })
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({
    name: 'stripe_payment_intent_id',
    type: 'varchar',
    length: 255,
    comment: 'Stripe payment intent ID',
  })
  stripePaymentIntentId: string;

  @Column({
    name: 'stripe_product_id',
    type: 'varchar',
    length: 255,
    comment: 'Stripe product ID at time of purchase',
  })
  stripeProductId: string;

  @Column({
    name: 'stripe_price_id',
    type: 'varchar',
    length: 255,
    comment: 'Stripe price ID at time of purchase',
  })
  stripePriceId: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: StudentCourseEnrollmentStatus,
    default: StudentCourseEnrollmentStatus.ACTIVE,
    comment: 'Enrollment status',
  })
  status: StudentCourseEnrollmentStatus;

  @Column({
    name: 'purchased_at',
    type: 'datetime',
    precision: 3,
    comment: 'Purchase timestamp',
  })
  purchasedAt: Date;

  @Column({
    name: 'cancelled_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: 'Cancellation timestamp',
  })
  cancelledAt: Date | null;

  @Column({
    name: 'refunded_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: 'Refund timestamp',
  })
  refundedAt: Date | null;

  @Column({
    name: 'metadata',
    type: 'json',
    nullable: true,
    comment: 'Additional fulfillment data',
  })
  metadata: Record<string, string | number | boolean> | null;

  @OneToMany('StudentCourseProgress', 'studentCourseEnrollment')
  progressRecords: StudentCourseProgress[];
}
