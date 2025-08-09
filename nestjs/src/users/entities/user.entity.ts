import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('users')
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
}
