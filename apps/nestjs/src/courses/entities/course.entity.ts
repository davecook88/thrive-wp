import { Entity, Column, Index, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import type { Session } from "../../sessions/entities/session.entity.js";
import type { CourseEnrollment } from "../../enrollments/entities/course-enrollment.entity.js";
import type { CourseTeacher } from "../../course-teachers/entities/course-teacher.entity.js";

/**
 * Course entity represents a program/container that may have zero or many scheduled sessions.
 * Enrollment is tracked independently of sessions.
 */
@Entity("course")
@Index(["slug"], { unique: true })
@Index(["isActive"])
export class Course extends BaseEntity {
  @Column({
    name: "slug",
    type: "varchar",
    length: 191,
    comment: "Human-friendly identifier",
  })
  slug: string;

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
    comment: "Course description",
  })
  description: string | null;

  @Column({
    name: "is_active",
    type: "tinyint",
    width: 1,
    default: () => "1",
    comment: "Whether the course is active",
  })
  isActive: boolean;

  @Column({
    name: "enrollment_opens_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "When enrollment opens (UTC)",
  })
  enrollmentOpensAt: Date | null;

  @Column({
    name: "enrollment_closes_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "When enrollment closes (UTC)",
  })
  enrollmentClosesAt: Date | null;

  @OneToMany("Session", "course")
  sessions: Session[];

  @OneToMany("CourseEnrollment", "course")
  enrollments: CourseEnrollment[];

  @OneToMany("CourseTeacher", "course")
  courseTeachers: CourseTeacher[];
}
