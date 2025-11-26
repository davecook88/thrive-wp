import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { User } from "../../users/entities/user.entity.js";

@Entity("notification")
export class Notification extends BaseEntity {
  @Column({
    name: "user_id",
    type: "int",
    comment: "FK to user.id",
  })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    name: "type",
    type: "varchar",
    length: 255,
    comment: "Notification type",
  })
  type: string;

  @Column({
    name: "data",
    type: "json",
    nullable: true,
    comment: "Notification data",
  })
  data: Record<string, any> | null;

  @Column({
    name: "is_read",
    type: "tinyint",
    width: 1,
    default: 0,
    comment: "Whether the notification has been read",
  })
  isRead: boolean;
}
