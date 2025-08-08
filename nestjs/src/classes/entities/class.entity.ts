import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum ClassType {
  ONE_TO_ONE = 'one-to-one',
  GROUP = 'group',
  COURSE = 'course',
}

export enum ClassStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity('classes')
@Index(['teacherId'])
@Index(['startTime'])
@Index(['status'])
export class ClassEntity extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Class title/name',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Class description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: ClassType,
    comment: 'Type of class',
  })
  type: ClassType;

  @Column({
    type: 'enum',
    enum: ClassStatus,
    default: ClassStatus.SCHEDULED,
    comment: 'Current class status',
  })
  status: ClassStatus;

  @Column({
    type: 'int',
    comment: 'Teacher ID conducting the class',
  })
  teacherId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Subject/topic of the class',
  })
  subject: string;

  @Column({
    type: 'datetime',
    comment: 'Class start time (UTC)',
  })
  startTime: Date;

  @Column({
    type: 'datetime',
    comment: 'Class end time (UTC)',
  })
  endTime: Date;

  @Column({
    type: 'int',
    default: 1,
    comment: 'Maximum number of students',
  })
  maxStudents: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Current number of enrolled students',
  })
  currentStudents: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Price per student (if applicable)',
  })
  price?: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
    comment: 'Currency code',
  })
  currency: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Google Classroom link or external platform URL',
  })
  platformUrl?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Class materials and resources (JSON)',
  })
  materials?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Teacher notes for the class',
  })
  teacherNotes?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Student feedback and notes',
  })
  studentNotes?: string;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Cancellation deadline (UTC)',
  })
  cancellationDeadline?: Date;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether class allows waitlist',
  })
  allowsWaitlist: boolean;

  // Utility methods
  get duration(): number {
    return Math.floor(
      (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60),
    ); // minutes
  }

  get isFullyBooked(): boolean {
    return this.currentStudents >= this.maxStudents;
  }

  get canBeCancelled(): boolean {
    return this.cancellationDeadline
      ? new Date() < this.cancellationDeadline
      : true;
  }

  get isUpcoming(): boolean {
    return this.startTime > new Date() && this.status === ClassStatus.SCHEDULED;
  }
}
