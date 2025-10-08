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
import { Session } from '../../sessions/entities/session.entity.js';
import type { CourseTeacher } from '../../course-teachers/entities/course-teacher.entity.js';
import { TeacherAvailability } from './teacher-availability.entity.js';

/**
 * Teacher entity represents extended profile & configuration for a user who can teach.
 * A user may have at most one teacher record (one-to-one). Soft deletes supported.
 */
@Entity('teacher')
@Index(['userId'], { unique: true })
@Index(['tier'])
export class Teacher extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'int',
    comment: 'FK to user.id (unique 1:1 with user)',
  })
  userId: number;

  @OneToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'tier',
    type: 'smallint',
    unsigned: true,
    default: 10,
    comment: 'Teacher tier (10,20,30...) used for pricing & access control',
  })
  tier: number;

  @Column({
    name: 'bio',
    type: 'text',
    nullable: true,
    comment: 'Public biography / profile information',
  })
  bio: string | null;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    width: 1,
    default: () => '1',
    comment: 'Whether the teacher is active & selectable for scheduling',
  })
  isActive: boolean;

  @OneToMany(
    () => TeacherAvailability,
    (avail: TeacherAvailability) => avail.teacher,
  )
  availability: TeacherAvailability[];

  @OneToMany(() => Session, 'teacher')
  sessions: Session[];

  @OneToMany('CourseTeacher', 'teacher')
  courseTeachers: CourseTeacher[];
}
