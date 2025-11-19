import { Entity, Column, Index, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import type { CourseStep } from "./course-step.entity.js";
import type { CourseProgramLevel } from "./course-program-level.entity.js";

/**
 * CourseProgram entity represents a structured course program with sequential steps.
 *
 * Simplified architecture:
 * - Stripe product info now stored in StripeProductMap (not here)
 * - Enrollments tracked via StudentPackage (not separate enrollment table)
 * - Course purchases grant PackageAllowances that reference this entity
 *
 * Timezone handling:
 * - All session times are stored in UTC in the database
 * - Client applications are responsible for displaying times in user's local timezone
 * - No course-level timezone configuration is maintained
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
    name: "is_active",
    type: "tinyint",
    width: 1,
    default: () => "1",
    comment: "Whether course is available for purchase",
  })
  isActive: boolean;

  @Column({
    name: "hero_image_url",
    type: "varchar",
    length: 512,
    nullable: true,
    comment: "URL to course hero image (placeholder support)",
  })
  heroImageUrl: string | null;

  @Column({
    name: "slug",
    type: "varchar",
    length: 100,
    nullable: true,
    unique: true,
    comment: "URL-friendly slug (future migration from code-based URLs)",
  })
  slug: string | null;

  @OneToMany("CourseStep", "courseProgram")
  steps: CourseStep[];

  @OneToMany("CourseProgramLevel", "courseProgram")
  courseProgramLevels: CourseProgramLevel[];
}
