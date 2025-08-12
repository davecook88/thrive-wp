import {
  Entity,
  Column,
  Index,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@/users/entities/user.entity';
import { TeacherAvailability } from '@/teachers/entities/teacher-availability.entity';

/**
 * Teacher entity represents extended profile & configuration for a user who can teach.
 * A user may have at most one teacher record (one-to-one). Soft deletes supported.
 */
@Entity('teachers')
@Index(['userId'], { unique: true })
@Index(['tier'])
export class Teacher extends BaseEntity {
  @Column({ type: 'int', comment: 'FK to users.id (unique 1:1 with users)' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'smallint',
    unsigned: true,
    default: 10,
    comment: 'Teacher tier (10,20,30...) used for pricing & access control',
  })
  tier: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Public biography / profile information',
  })
  bio: string | null;

  @Column({
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
}
