import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { CourseProgram } from './course-program.entity.js';

/**
 * Enumeration of bundle component types.
 */
export enum CourseBundleComponentType {
  PRIVATE_CREDIT = 'PRIVATE_CREDIT',
  GROUP_CREDIT = 'GROUP_CREDIT',
}

/**
 * CourseBundleComponent entity defines extras bundled with course purchase.
 * Includes private session credits or additional group class entitlements.
 */
@Entity('course_bundle_component')
@Index(['courseProgramId'])
export class CourseBundleComponent extends BaseEntity {
  @Column({
    name: 'course_program_id',
    type: 'int',
    comment: 'FK to course_program.id',
  })
  courseProgramId: number;

  @ManyToOne(() => CourseProgram, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_program_id' })
  courseProgram: CourseProgram;

  @Column({
    name: 'component_type',
    type: 'enum',
    enum: CourseBundleComponentType,
    comment: 'Type of bundled component',
  })
  componentType: CourseBundleComponentType;

  @Column({
    name: 'quantity',
    type: 'smallint',
    unsigned: true,
    default: 1,
    comment: 'Number of credits/items',
  })
  quantity: number;

  @Column({
    name: 'description',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Human-readable description',
  })
  description: string | null;

  @Column({
    name: 'metadata',
    type: 'json',
    nullable: true,
    comment: 'Additional configuration (package IDs, etc.)',
  })
  metadata: Record<string, string | number | boolean> | null;
}
