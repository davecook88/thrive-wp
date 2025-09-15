import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { Session } from '../../sessions/entities/session.entity.js';
import { Student } from '../../students/entities/student.entity.js';

/**
 * Enumeration of booking statuses.
 */
export enum BookingStatus {
  INVITED = 'INVITED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  FORFEIT = 'FORFEIT',
  PENDING = 'PENDING',
}

/**
 * Booking entity represents a student's seat in a session.
 */
@Entity('booking')
@Unique(['sessionId', 'studentId'])
@Index(['sessionId'])
@Index(['studentId'])
export class Booking extends BaseEntity {
  @Column({
    name: 'session_id',
    type: 'int',
    comment: 'FK to session.id',
  })
  sessionId: number;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

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
    name: 'status',
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.CONFIRMED,
    comment: 'Booking status',
  })
  status: BookingStatus;

  @Column({
    name: 'cancelled_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: 'Cancellation timestamp (UTC)',
  })
  cancelledAt: Date | null;

  @Column({
    name: 'cancellation_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Reason for cancellation',
  })
  cancellationReason: string | null;

  @Column({
    name: 'invited_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: 'Invitation timestamp (UTC)',
  })
  invitedAt: Date | null;

  @Column({
    name: 'accepted_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: 'Acceptance timestamp (UTC)',
  })
  acceptedAt: Date | null;
}
