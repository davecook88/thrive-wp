import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { GroupClass } from "./group-class.entity.js";
import { Teacher } from "../../teachers/entities/teacher.entity.js";

@Entity("group_class_teacher")
@Unique(["groupClassId", "teacherId"])
@Index(["groupClassId"])
@Index(["teacherId"])
export class GroupClassTeacher extends BaseEntity {
  @Column({
    name: "group_class_id",
    type: "int",
    comment: "FK to group_class.id",
  })
  groupClassId: number;

  @ManyToOne(() => GroupClass, { onDelete: "CASCADE" })
  @JoinColumn({ name: "group_class_id" })
  groupClass: GroupClass;

  @Column({
    name: "teacher_id",
    type: "int",
    comment: "FK to teacher.id",
  })
  teacherId: number;

  @ManyToOne(() => Teacher, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "teacher_id" })
  teacher: Teacher;

  @Column({
    name: "is_primary",
    type: "boolean",
    default: false,
    comment: "Primary teacher",
  })
  isPrimary: boolean;
}
