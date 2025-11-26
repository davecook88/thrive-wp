import { Entity, Column, Index, OneToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import type { Teacher } from "../../teachers/entities/teacher.entity.js";

/**
 * Status of the OAuth token for Google Calendar API
 */
export enum GoogleTokenStatus {
  VALID = "VALID",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
  ERROR = "ERROR",
}

/**
 * Entity storing Google OAuth credentials for teachers.
 * Each teacher may have at most one credential record (one-to-one).
 * Tokens are stored encrypted for security.
 */
@Entity("teacher_google_credential")
@Index(["teacherId"], { unique: true })
export class TeacherGoogleCredential extends BaseEntity {
  @Column({
    name: "teacher_id",
    type: "int",
    comment: "FK to teacher.id (unique 1:1 with teacher)",
  })
  teacherId: number;

  @OneToOne("Teacher", { onDelete: "CASCADE" })
  @JoinColumn({ name: "teacher_id" })
  teacher: Teacher;

  @Column({
    name: "calendar_id",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "Google Calendar ID (usually primary email)",
  })
  calendarId: string | null;

  @Column({
    name: "access_token_enc",
    type: "text",
    comment: "Encrypted access token",
  })
  accessTokenEnc: string;

  @Column({
    name: "refresh_token_enc",
    type: "text",
    comment: "Encrypted refresh token",
  })
  refreshTokenEnc: string;

  @Column({
    name: "expires_at",
    type: "datetime",
    precision: 3,
    comment: "Access token expiration timestamp (UTC)",
  })
  expiresAt: Date;

  @Column({
    name: "scope",
    type: "varchar",
    length: 500,
    comment: "Granted OAuth scopes",
  })
  scope: string;

  @Column({
    name: "token_status",
    type: "enum",
    enum: GoogleTokenStatus,
    default: GoogleTokenStatus.VALID,
    comment: "Current status of the OAuth token",
  })
  tokenStatus: GoogleTokenStatus;
}
