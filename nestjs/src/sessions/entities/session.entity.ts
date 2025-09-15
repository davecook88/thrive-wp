import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { Course } from '../../courses/entities/course.entity.js';
import { Teacher } from '../../teachers/entities/teacher.entity.js';
import { TeacherAvailability } from '../../teachers/entities/teacher-availability.entity.js';
import { ServiceType } from '../../common/types/class-types.js';

/**
 * Enumeration of session statuses.
 */
export enum SessionStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/**
 * Enumeration of session visibility levels.
 */
export enum SessionVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  HIDDEN = 'HIDDEN',
}

/**
 * Session entity represents a scheduled, bookable session.
 * Covers all three types via type enum.
 */
@Entity('session')
@Index(['teacherId', 'startAt'])
@Index(['courseId', 'startAt'])
@Index(['startAt'])
export class Session extends BaseEntity {
  @Column({
    name: 'type',
    type: 'enum',
    enum: ServiceType,
    comment: 'Type of session',
  })
  type: ServiceType;

  @Column({
    name: 'course_id',
    type: 'int',
    nullable: true,
    comment: 'FK to course.id (set for course sessions)',
  })
  courseId: number | null;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'course_id' })
  course: Course | null;

  @Column({
    name: 'teacher_id',
    type: 'int',
    comment: 'FK to teacher.id',
  })
  teacherId: number;

  @ManyToOne(() => Teacher, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({
    name: 'created_from_availability_id',
    type: 'int',
    nullable: true,
    comment: 'FK to teacher_availability.id (optional)',
  })
  createdFromAvailabilityId: number | null;

  @ManyToOne(() => TeacherAvailability, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_from_availability_id' })
  createdFromAvailability: TeacherAvailability | null;

  @Column({
    name: 'start_at',
    type: 'datetime',
    precision: 3,
    comment: 'Session start time (UTC)',
  })
  startAt: Date;

  @Column({
    name: 'end_at',
    type: 'datetime',
    precision: 3,
    comment: 'Session end time (UTC)',
  })
  endAt: Date;

  @Column({
    name: 'capacity_max',
    type: 'smallint',
    unsigned: true,
    default: 1,
    comment: 'Maximum number of participants',
  })
  capacityMax: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
    comment: 'Session status',
  })
  status: SessionStatus;

  @Column({
    name: 'visibility',
    type: 'enum',
    enum: SessionVisibility,
    default: SessionVisibility.PUBLIC,
    comment: 'Session visibility level',
  })
  visibility: SessionVisibility;

  @Column({
    name: 'requires_enrollment',
    type: 'tinyint',
    width: 1,
    default: () => '0',
    comment: 'Whether enrollment is required for course sessions',
  })
  requiresEnrollment: boolean;

  @Column({
    name: 'meeting_url',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Join link for the meeting',
  })
  meetingUrl: string | null;

  @Column({
    name: 'source_timezone',
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Original timezone of the creator',
  })
  sourceTimezone: string | null;

  @OneToMany('Booking', 'session')
  bookings: any[];

  @OneToMany('Waitlist', 'session')
  waitlists: any[];
}
