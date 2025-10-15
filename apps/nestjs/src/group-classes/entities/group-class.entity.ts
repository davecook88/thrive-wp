import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import type { GroupClassTeacher } from './group-class-teacher.entity.js';
import type { GroupClassLevel } from './group-class-level.entity.js';
import type { Session } from '../../sessions/entities/session.entity.js';

@Entity('group_class')
@Index(['isActive'])
export class GroupClass extends BaseEntity {
  @Column({
    name: 'title',
    type: 'varchar',
    length: 255,
    comment: 'Class title',
  })
  title: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Class description',
  })
  description: string | null;

  @Column({
    name: 'capacity_max',
    type: 'smallint',
    unsigned: true,
    default: 6,
    comment: 'Maximum students',
  })
  capacityMax: number;

  @Column({
    name: 'rrule',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'RFC5545 RRULE for recurring',
  })
  rrule: string | null;

  @Column({
    name: 'start_date',
    type: 'date',
    nullable: true,
    comment: 'First occurrence date',
  })
  startDate: Date | null;

  @Column({
    name: 'end_date',
    type: 'date',
    nullable: true,
    comment: 'Last occurrence date',
  })
  endDate: Date | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
    comment: 'Whether class is active',
  })
  isActive: boolean;

  @OneToMany('GroupClassTeacher', 'groupClass')
  groupClassTeachers: GroupClassTeacher[];

  @OneToMany('GroupClassLevel', 'groupClass')
  groupClassLevels: GroupClassLevel[];

  @OneToMany('Session', 'groupClass')
  sessions: Session[];
}
