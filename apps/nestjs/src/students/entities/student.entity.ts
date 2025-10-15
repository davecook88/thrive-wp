import {
  Entity,
  Column,
  Index,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import type { User } from '../../users/entities/user.entity.js';
import { Booking } from '../../payments/entities/booking.entity.js';
import type { CourseEnrollment } from '../../enrollments/entities/course-enrollment.entity.js';
import { Waitlist } from '../../waitlists/entities/waitlist.entity.js';

/**
 * Student entity represents a student profile for users.
 * A user may have at most one student record (one-to-one). Soft deletes supported.
 */
@Entity('student')
@Index(['userId'], { unique: true })
export class Student extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'int',
    comment: 'FK to user.id (unique 1:1 with user)',
  })
  userId: number;

  @Column({
    name: 'stripe_customer_id',
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Stripe Customer ID for reuse',
  })
  @Index({ unique: true })
  stripeCustomerId?: string;

  @OneToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Booking, (booking) => booking.student)
  bookings: Booking[];

  @OneToMany('CourseEnrollment', 'student')
  courseEnrollments: CourseEnrollment[];

  @OneToMany(() => Waitlist, 'student')
  waitlists: Waitlist[];
}
