import { Entity, Column, Index, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { Admin } from '../../admin/entities/admin.entity.js';
import { Teacher } from '../../teachers/entities/teacher.entity.js';

@Entity('user')
@Index(['email'], { unique: true })
export class User extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'User email address (primary identifier)',
  })
  email: string;
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'User first name',
  })
  firstName: string;
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'User last name',
  })
  lastName: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'BCrypt password hash for local (email/password) auth',
  })
  passwordHash: string | null;

  @OneToOne(() => Admin, (admin) => admin.user, { nullable: true })
  admin: Admin | null;

  @OneToOne(() => Teacher, (teacher) => teacher.user, { nullable: true })
  teacher: Teacher | null;
}
