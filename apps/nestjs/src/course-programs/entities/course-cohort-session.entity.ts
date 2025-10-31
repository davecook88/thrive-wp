import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { CourseCohort } from "./course-cohort.entity.js";
import { CourseStep } from "./course-step.entity.js";
import { CourseStepOption } from "./course-step-option.entity.js";

/**
 * CourseCohortSession is a join table that links a cohort to specific CourseStepOption sessions.
 *
 * This defines which sessions are part of which cohort. Each cohort has:
 * - One session option per course step (single-option steps)
 * - Or multiple session options per step (multi-option steps, student chooses)
 *
 * The unique constraint ensures a cohort cannot have duplicate step assignments.
 *
 * Example:
 * - Cohort: "Fall 2025 Cohort"
 * - Step 1: Monday 6pm session (course_step_option_id: 3)
 * - Step 2: Wednesday 7pm session (course_step_option_id: 7)
 * - Step 3: Friday 5pm session (course_step_option_id: 12)
 */
@Entity("course_cohort_session")
@Index(["cohortId", "courseStepId", "courseStepOptionId"], { unique: true })
@Index(["cohortId"])
@Index(["courseStepOptionId"])
export class CourseCohortSession extends BaseEntity {
  @Column({
    name: "cohort_id",
    type: "int",
    comment: "Parent cohort",
  })
  cohortId: number;

  @ManyToOne(() => CourseCohort, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cohort_id" })
  cohort: CourseCohort;

  @Column({
    name: "course_step_id",
    type: "int",
    comment: "Which step this session fulfills",
  })
  courseStepId: number;

  @ManyToOne(() => CourseStep, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_step_id" })
  courseStep: CourseStep;

  @Column({
    name: "course_step_option_id",
    type: "int",
    comment: "Specific session option selected for this cohort",
  })
  courseStepOptionId: number;

  @ManyToOne(() => CourseStepOption, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_step_option_id" })
  courseStepOption: CourseStepOption;
}
