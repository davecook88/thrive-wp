import { Entity, Column, ManyToOne, JoinColumn, Index, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import type { CourseProgram } from "./course-program.entity.js";
import type { Level } from "../../levels/entities/level.entity.js";

/**
 * CourseProgramLevel entity represents the many-to-many relationship
 * between course programs and levels.
 *
 * Indicates which proficiency levels are appropriate for students
 * enrolling in this course program.
 */
@Entity("course_program_level")
@Index(["courseProgramId", "levelId"], { unique: true })
@Index(["courseProgramId"])
@Index(["levelId"])
export class CourseProgramLevel {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({
    name: "course_program_id",
    type: "int",
  })
  courseProgramId: number;

  @Column({
    name: "level_id",
    type: "int",
  })
  levelId: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne("CourseProgram", "courseProgramLevels")
  @JoinColumn({ name: "course_program_id" })
  courseProgram: CourseProgram;

  @ManyToOne("Level")
  @JoinColumn({ name: "level_id" })
  level: Level;
}
