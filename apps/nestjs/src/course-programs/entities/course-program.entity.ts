import { Entity, Column, Index, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import type { CourseStep } from "./course-step.entity.js";
import type { CourseBundleComponent } from "./course-bundle-component.entity.js";
import type { StudentCourseEnrollment } from "./student-course-enrollment.entity.js";

/**
 * CourseProgram entity represents a structured course program with steps and bundled components.
 * Sold as Stripe products with enrollment tracking.
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

  @Column({
    name: "stripe_product_id",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "Stripe product ID",
  })
  stripeProductId: string | null;

  @Column({
    name: "stripe_price_id",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "Stripe price ID",
  })
  stripePriceId: string | null;

  @OneToMany("CourseStep", "courseProgram")
  steps: CourseStep[];

  @OneToMany("CourseBundleComponent", "courseProgram")
  bundleComponents: CourseBundleComponent[];

  @OneToMany("StudentCourseEnrollment", "courseProgram")
  enrollments: StudentCourseEnrollment[];
}
