import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
@Index(['token'], { unique: true })
@Index(['userId', 'deviceId'])
export class RefreshToken extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Refresh token value',
  })
  token: string;

  @Column({
    type: 'int',
    comment: 'User ID who owns this token',
  })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Device identifier for session tracking',
  })
  deviceId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'User agent string',
  })
  userAgent?: string;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP address of the device',
  })
  ipAddress?: string;

  @Column({
    type: 'datetime',
    comment: 'Token expiration timestamp (UTC)',
  })
  expiresAt: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether token has been revoked',
  })
  isRevoked: boolean;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Last used timestamp (UTC)',
  })
  lastUsedAt?: Date;

  // Utility methods
  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  get isValid(): boolean {
    return !this.isRevoked && !this.isExpired;
  }
}
