import { Entity, Column, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import type { User } from '../../users/entities/user.entity.js';

/**
 * Admin entity represents administrative users with elevated privileges.
 * A user may have at most one admin record (one-to-one). Soft deletes supported.
 */
@Entity('admin')
@Index(['userId'], { unique: true })
export class Admin extends BaseEntity {
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
    name: 'role',
    type: 'varchar',
    length: 100,
    default: 'admin',
    comment: 'Admin role/level (admin, super_admin, etc.)',
  })
  role: string;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    width: 1,
    default: () => '1',
    comment: 'Whether the admin account is active',
  })
  isActive: boolean;
}
