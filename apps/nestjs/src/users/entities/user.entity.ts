import { Entity, Column, Index, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { Admin } from '../../courses/entities/admin.entity.js';
import { Teacher } from '../../teachers/entities/teacher.entity.js';
import { Student } from '../../students/entities/student.entity.js';

@Entity('user')
@Index(['email'], { unique: true })
export class User extends BaseEntity {
  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    comment: 'User email address (primary identifier)',
  })
  email: string;

  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 255,
    comment: 'User first name',
  })
  firstName: string;

  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 255,
    comment: 'User last name',
  })
  lastName: string;

  @Column({
    name: 'password_hash',
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

  @OneToOne(() => Student, (student) => student.user, { nullable: true })
  student: Student | null;
}
