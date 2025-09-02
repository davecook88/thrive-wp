import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Relation,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import type { Teacher } from './teacher.entity.js';

/**
 * Enumeration of availability kinds for teachers.
 * ONE_OFF: Specific single window between startAt & endAt.
 * RECURRING: Weekly recurrence using weekday + start/end minutes from midnight UTC.
 * BLACKOUT: Overrides availability (e.g., vacation) between startAt & endAt.
 */
export enum TeacherAvailabilityKind {
  ONE_OFF = 'ONE_OFF',
  RECURRING = 'RECURRING',
  BLACKOUT = 'BLACKOUT',
}

@Entity('teacher_availability')
// Indexes must reference entity property names, not DB column names
@Index(['teacherId'], { unique: false })
@Index(['teacherId', 'kind'], { unique: false })
@Index(['teacherId', 'weekday', 'startTimeMinutes'], { unique: false })
export class TeacherAvailability extends BaseEntity {
  @Column({
    name: 'teacher_id',
    type: 'int',
    comment: 'FK to teacher.id',
  })
  teacherId: number;

  @ManyToOne('Teacher', (teacher: Teacher) => teacher.availability, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({
    name: 'kind',
    type: 'enum',
    enum: TeacherAvailabilityKind,
    comment: 'Type of availability window',
  })
  kind: TeacherAvailabilityKind;

  @Column({
    name: 'weekday',
    type: 'tinyint',
    nullable: true,
    comment: '0=Sunday .. 6=Saturday (only for RECURRING)',
  })
  weekday: number | null;

  @Column({
    name: 'start_time_minutes',
    type: 'smallint',
    unsigned: true,
    nullable: true,
    comment: 'Start minutes from 00:00 UTC (RECURRING only)',
  })
  startTimeMinutes: number | null;

  @Column({
    name: 'end_time_minutes',
    type: 'smallint',
    unsigned: true,
    nullable: true,
    comment: 'End minutes from 00:00 UTC (RECURRING only)',
  })
  endTimeMinutes: number | null;

  @Column({
    name: 'start_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: 'UTC start datetime (ONE_OFF/BLACKOUT)',
  })
  startAt: Date | null;

  @Column({
    name: 'end_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: 'UTC end datetime (ONE_OFF/BLACKOUT)',
  })
  endAt: Date | null;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    width: 1,
    default: () => '1',
    comment: 'Whether this availability entry is active',
  })
  isActive: boolean;

  @OneToMany('Session', 'createdFromAvailability')
  sessions: any[];
}
