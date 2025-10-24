import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { CourseProgram } from "./course-program.entity.js";
import type { CourseStepOption } from "./course-step-option.entity.js";
import type { StudentCourseStepProgress } from "./student-course-step-progress.entity.js";

/**
 * CourseStep entity represents an ordered step within a course program.
 * Each step can have multiple class options for students to choose from.
 */
@Entity("course_step")
@Index(["courseProgramId", "stepOrder"])
@Index(["courseProgramId", "label"], { unique: true })
export class CourseStep extends BaseEntity {
  @Column({
    name: "course_program_id",
    type: "int",
    comment: "FK to course_program.id",
  })
  courseProgramId: number;

  @ManyToOne(() => CourseProgram, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_program_id" })
  courseProgram: CourseProgram;

  @Column({
    name: "step_order",
    type: "smallint",
    unsigned: true,
    comment: "Ordering within course (1, 2, 3...)",
  })
  stepOrder: number;

  @Column({
    name: "label",
    type: "varchar",
    length: 100,
    comment: 'Step label (e.g., "SFZ-1", "Foundation")',
  })
  label: string;

  @Column({
    name: "title",
    type: "varchar",
    length: 255,
    comment: "Step title",
  })
  title: string;

  @Column({
    name: "description",
    type: "text",
    nullable: true,
    comment: "Step content/overview",
  })
  description: string | null;

  @Column({
    name: "is_required",
    type: "tinyint",
    width: 1,
    default: () => "1",
    comment: "Whether step must be completed",
  })
  isRequired: boolean;

  @OneToMany("CourseStepOption", "courseStep")
  options: CourseStepOption[];

  @OneToMany("StudentCourseStepProgress", "courseStep")
  progressRecords: StudentCourseStepProgress[];
}
