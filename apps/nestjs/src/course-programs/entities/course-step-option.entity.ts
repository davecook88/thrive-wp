import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { CourseStep } from './course-step.entity.js';
import { GroupClass } from '../../group-classes/entities/group-class.entity.js';

/**
 * CourseStepOption entity links course steps to available group class options.
 * Allows multiple class options per step for student choice.
 */
@Entity('course_step_option')
@Index(['courseStepId', 'groupClassId'], { unique: true })
@Index(['courseStepId'])
@Index(['groupClassId'])
export class CourseStepOption extends BaseEntity {
  @Column({
    name: 'course_step_id',
    type: 'int',
    comment: 'FK to course_step.id',
  })
  courseStepId: number;

  @ManyToOne(() => CourseStep, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_step_id' })
  courseStep: CourseStep;

  @Column({
    name: 'group_class_id',
    type: 'int',
    comment: 'FK to group_class.id',
  })
  groupClassId: number;

  @ManyToOne(() => GroupClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_class_id' })
  groupClass: GroupClass;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    width: 1,
    default: () => '1',
    comment: 'Whether this option is available',
  })
  isActive: boolean;
}
