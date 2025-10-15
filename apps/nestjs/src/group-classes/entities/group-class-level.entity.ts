import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { GroupClass } from "./group-class.entity.js";
import { Level } from "../../levels/entities/level.entity.js";

@Entity("group_class_level")
@Unique(["groupClassId", "levelId"])
@Index(["groupClassId"])
@Index(["levelId"])
export class GroupClassLevel extends BaseEntity {
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
    name: "level_id",
    type: "int",
    comment: "FK to level.id",
  })
  levelId: number;

  @ManyToOne(() => Level, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "level_id" })
  level: Level;
}
