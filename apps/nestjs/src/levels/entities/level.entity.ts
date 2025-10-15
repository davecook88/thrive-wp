import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";

@Entity("level")
@Index(["isActive"])
@Index(["sortOrder"])
export class Level extends BaseEntity {
  @Column({
    name: "code",
    type: "varchar",
    length: 10,
    unique: true,
    comment: "Level code like A1, A2, B1",
  })
  code: string;

  @Column({
    name: "name",
    type: "varchar",
    length: 100,
    comment: "Display name",
  })
  name: string;

  @Column({
    name: "description",
    type: "text",
    nullable: true,
    comment: "Level description",
  })
  description: string | null;

  @Column({
    name: "sort_order",
    type: "int",
    default: 0,
    comment: "Display ordering",
  })
  sortOrder: number;

  @Column({
    name: "is_active",
    type: "boolean",
    default: true,
    comment: "Whether level is active",
  })
  isActive: boolean;
}
