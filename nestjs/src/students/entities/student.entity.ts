import { Entity, Column, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import type { User } from '../../users/entities/user.entity.js';

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

  @OneToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
