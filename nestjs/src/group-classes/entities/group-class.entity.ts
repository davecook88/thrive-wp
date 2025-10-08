import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { Level } from '../../levels/entities/level.entity.js';
import type { GroupClassTeacher } from './group-class-teacher.entity.js';
import type { Session } from '../../sessions/entities/session.entity.js';

@Entity('group_class')
@Index(['levelId'])
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
    name: 'level_id',
    type: 'int',
    comment: 'FK to level.id',
  })
  levelId: number;

  @ManyToOne(() => Level, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'level_id' })
  level: Level;

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

  @OneToMany('Session', 'groupClass')
  sessions: Session[];
}
