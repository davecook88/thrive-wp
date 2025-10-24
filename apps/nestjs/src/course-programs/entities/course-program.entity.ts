import { Entity, Column, Index, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import type { CourseStep } from "./course-step.entity.js";

/**
 * CourseProgram entity represents a structured course program with sequential steps.
 *
 * Simplified architecture:
 * - Stripe product info now stored in StripeProductMap (not here)
 * - Enrollments tracked via StudentPackage (not separate enrollment table)
 * - Course purchases grant PackageAllowances that reference this entity
 */
@Entity("course_program")
@Index(["code"], { unique: true })
@Index(["isActive"])
export class CourseProgram extends BaseEntity {
  @Column({
    name: "code",
    type: "varchar",
    length: 50,
    comment: 'Human-readable code (e.g., "SFZ", "ADV-TECH")',
  })
  code: string;

  @Column({
    name: "title",
    type: "varchar",
    length: 255,
    comment: "Course title",
  })
  title: string;

  @Column({
    name: "description",
    type: "text",
    nullable: true,
    comment: "Marketing description",
  })
  description: string | null;

  @Column({
    name: "timezone",
    type: "varchar",
    length: 64,
    default: "America/New_York",
    comment: "Default timezone for scheduling",
  })
  timezone: string;

  @Column({
    name: "is_active",
    type: "tinyint",
    width: 1,
    default: () => "1",
    comment: "Whether course is available for purchase",
  })
  isActive: boolean;

  @OneToMany("CourseStep", "courseProgram")
  steps: CourseStep[];
}
