import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { CourseStep } from "../../course-programs/entities/course-step.entity.js";
import { User } from "../../users/entities/user.entity.js";
import type { MaterialQuestion } from "./material-question.entity.js";

@Entity("course_step_material")
@Index(["courseStepId", "order"])
@Index(["createdById"])
export class CourseStepMaterial extends BaseEntity {
  @Column({ name: "course_step_id", type: "int", comment: "FK to course_step.id" })
  courseStepId: number;

  @ManyToOne(() => CourseStep, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_step_id" })
  courseStep: CourseStep;

  @Column({ name: "title", type: "varchar", length: 255, comment: "Material title" })
  title: string;

  @Column({ name: "description", type: "text", nullable: true, comment: "Material description" })
  description: string | null;

  @Column({
    name: "type",
    type: "enum",
    enum: ["file", "video_embed", "rich_text", "question"],
    comment: "Type of material (e.g., file, video, rich text, or a question prompt)",
  })
  type: "file" | "video_embed" | "rich_text" | "question";

  @Column({ name: "content", type: "text", nullable: true, comment: "URL for file, embed code for video, markdown for rich text. Null if type is 'question'." })
  content: string | null;

  @Column({
    name: "order",
    type: "smallint",
    unsigned: true,
    comment: "Ordering within the course step",
  })
  order: number;

  @Column({ name: "created_by_id", type: "int", comment: "FK to user.id (admin who created it)" })
  createdById: number;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_id" })
  createdBy: User;

  @OneToMany("MaterialQuestion", "courseStepMaterial")
  questions: MaterialQuestion[];
}
