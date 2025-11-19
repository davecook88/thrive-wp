import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { Session } from "../../sessions/entities/session.entity.js";
import { User } from "../../users/entities/user.entity.js";

@Entity("session_material")
@Index(["sessionId"])
@Index(["createdById"])
export class SessionMaterial extends BaseEntity {
  @Column({ name: "session_id", type: "int", comment: "FK to session.id" })
  sessionId: number;

  @ManyToOne(() => Session, { onDelete: "CASCADE" })
  @JoinColumn({ name: "session_id" })
  session: Session;

  @Column({ name: "title", type: "varchar", length: 255, comment: "Material title" })
  title: string;

  @Column({ name: "description", type: "text", nullable: true, comment: "Material description" })
  description: string | null;

  @Column({
    name: "type",
    type: "enum",
    enum: ["file", "video_embed", "rich_text"],
    comment: "Type of material",
  })
  type: "file" | "video_embed" | "rich_text";

  @Column({ name: "content", type: "text", comment: "URL for file, embed code for video, or markdown for rich text" })
  content: string;

  @Column({ name: "created_by_id", type: "int", comment: "FK to user.id (admin who created it)" })
  createdById: number;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_id" })
  createdBy: User;
}
