import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { Student } from "../../students/entities/student.entity.js";
import { CourseStepMaterial } from "./course-step-material.entity.js";
import { StudentPackage } from "../../packages/entities/student-package.entity.js";

@Entity("student_course_step_material_progress")
@Index(["studentId", "courseStepMaterialId"], { unique: true })
@Index(["studentPackageId"])
export class StudentCourseStepMaterialProgress extends BaseEntity {
  @Column({ name: "student_id", type: "int", comment: "FK to student.id" })
  studentId: number;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_id" })
  student: Student;

  @Column({ name: "course_step_material_id", type: "int", comment: "FK to course_step_material.id" })
  courseStepMaterialId: number;

  @ManyToOne(() => CourseStepMaterial, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_step_material_id" })
  courseStepMaterial: CourseStepMaterial;

  @Column({
    name: "status",
    type: "enum",
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started",
    comment: "Status of student's progress on this material",
  })
  status: "not_started" | "in_progress" | "completed";

  @Column({ name: "completed_at", type: "datetime", nullable: true, comment: "Timestamp when material was completed" })
  completedAt: Date | null;

  @Column({ name: "student_package_id", type: "int", comment: "FK to student_package.id, linking to the specific enrollment" })
  studentPackageId: number;

  @ManyToOne(() => StudentPackage, { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_package_id" })
  studentPackage: StudentPackage;
}
