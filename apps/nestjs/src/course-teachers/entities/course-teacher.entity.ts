import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { Course } from "../../courses/entities/course.entity.js";
import { Teacher } from "../../teachers/entities/teacher.entity.js";

/**
 * Enumeration of course teacher roles.
 */
export enum CourseTeacherRole {
  LEAD = "LEAD",
  ASSISTANT = "ASSISTANT",
}

/**
 * CourseTeacher entity represents the many-to-many association between courses and teachers.
 */
@Entity("course_teacher")
@Unique(["courseId", "teacherId"])
@Index(["courseId"])
@Index(["teacherId"])
export class CourseTeacher extends BaseEntity {
  @Column({
    name: "course_id",
    type: "int",
    comment: "FK to course.id",
  })
  courseId: number;

  @ManyToOne(() => Course, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course: Course;

  @Column({
    name: "teacher_id",
    type: "int",
    comment: "FK to teacher.id",
  })
  teacherId: number;

  @ManyToOne(() => Teacher, { onDelete: "CASCADE" })
  @JoinColumn({ name: "teacher_id" })
  teacher: Teacher;

  @Column({
    name: "role",
    type: "enum",
    enum: CourseTeacherRole,
    default: CourseTeacherRole.LEAD,
    comment: "Role of the teacher in the course",
  })
  role: CourseTeacherRole;
}
