import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

export enum UserRole {
  PUBLIC = 'public',
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  WORDPRESS = 'wordpress',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['wordpressUserId'])
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
    nullable: true,
    comment: 'First name',
  })
  firstName?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Last name',
  })
  lastName?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
    comment: 'Hashed password (null for OAuth users)',
  })
  passwordHash?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
    comment: 'Primary user role',
  })
  role: UserRole;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional permissions beyond base role',
  })
  permissions?: string[];

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
    comment: 'Authentication provider used',
  })
  authProvider: AuthProvider;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'External provider user ID (Google, etc.)',
  })
  externalId?: string;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: 'WordPress user ID for sync purposes',
  })
  wordpressUserId?: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Email verification status',
  })
  emailVerified: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Email verification token',
  })
  emailVerificationToken?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Password reset token',
  })
  passwordResetToken?: string;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Password reset token expiry (UTC)',
  })
  passwordResetExpires?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Failed login attempt counter',
  })
  failedLoginAttempts: number;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Account lockout until timestamp (UTC)',
  })
  lockedUntil?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Last successful login timestamp (UTC)',
  })
  lastLoginAt?: Date;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'Last login IP address',
  })
  lastLoginIp?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'User timezone for scheduling',
  })
  timezone?: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'en',
    comment: 'Preferred language',
  })
  preferredLanguage: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Account active status',
  })
  isActive: boolean;

  // Teacher-specific fields
  @Column({
    type: 'int',
    nullable: true,
    comment: 'Teacher tier level (10, 20, 30, etc.)',
  })
  teacherTier?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Teacher bio/description',
  })
  bio?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Teacher qualifications and certifications',
  })
  qualifications?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Subjects teacher can teach',
  })
  subjects?: string[];

  // Utility methods
  get fullName(): string {
    return (
      [this.firstName, this.lastName].filter(Boolean).join(' ') || this.email
    );
  }

  get isTeacher(): boolean {
    return this.role === UserRole.TEACHER || this.role === UserRole.ADMIN;
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  get isLocked(): boolean {
    return (this.lockedUntil && this.lockedUntil > new Date()) ?? false;
  }
}
