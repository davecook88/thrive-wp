import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { CourseStepMaterial } from "./course-step-material.entity.js";
import type { StudentAnswer } from "./student-answer.entity.js";

@Entity("material_question")
@Index(["courseStepMaterialId"])
export class MaterialQuestion extends BaseEntity {
  @Column({ name: "course_step_material_id", type: "int", comment: "FK to course_step_material.id" })
  courseStepMaterialId: number;

  @ManyToOne(() => CourseStepMaterial, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_step_material_id" })
  courseStepMaterial: CourseStepMaterial;

  @Column({ name: "question_text", type: "text", comment: "The question prompt" })
  questionText: string;

  @Column({
    name: "question_type",
    type: "enum",
    enum: ["multiple_choice", "long_text", "file_upload", "video_upload"],
    comment: "Type of question, determining how it's answered and assessed",
  })
  questionType: "multiple_choice" | "long_text" | "file_upload" | "video_upload";

  @Column({ name: "options", type: "json", nullable: true, comment: "JSON array of options for multiple_choice questions" })
  options: Record<string, any> | null; // For multiple choice options

  @OneToMany("StudentAnswer", "question")
  answers: StudentAnswer[];
}
