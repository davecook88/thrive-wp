import { Entity, Column, Index, OneToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import type { Session } from "../../sessions/entities/session.entity.js";

/**
 * Status of the Google Meet event lifecycle
 */
export enum MeetEventStatus {
  PENDING = "PENDING",
  CREATING = "CREATING",
  READY = "READY",
  UPDATING = "UPDATING",
  ERROR = "ERROR",
  CANCELED = "CANCELED",
}

/**
 * Entity tracking Google Meet events associated with sessions.
 * Each session may have at most one Meet event (one-to-one).
 */
@Entity("session_meet_event")
@Index(["sessionId"], { unique: true })
@Index(["status"])
@Index(["nextRetryAt"])
export class SessionMeetEvent extends BaseEntity {
  @Column({
    name: "session_id",
    type: "int",
    comment: "FK to session.id (unique 1:1 with session)",
  })
  sessionId: number;

  @OneToOne("Session", { onDelete: "CASCADE" })
  @JoinColumn({ name: "session_id" })
  session: Session;

  @Column({
    name: "google_event_id",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "Google Calendar event ID",
  })
  googleEventId: string | null;

  @Column({
    name: "hangout_link",
    type: "varchar",
    length: 500,
    nullable: true,
    comment: "Google Meet URL",
  })
  hangoutLink: string | null;

  @Column({
    name: "conference_data_version",
    type: "int",
    default: 0,
    comment: "Version for conference data updates",
  })
  conferenceDataVersion: number;

  @Column({
    name: "status",
    type: "enum",
    enum: MeetEventStatus,
    default: MeetEventStatus.PENDING,
    comment: "Meet event creation/sync status",
  })
  status: MeetEventStatus;

  @Column({
    name: "last_error",
    type: "text",
    nullable: true,
    comment: "Last error message if status is ERROR",
  })
  lastError: string | null;

  @Column({
    name: "retry_count",
    type: "int",
    default: 0,
    comment: "Number of retry attempts",
  })
  retryCount: number;

  @Column({
    name: "next_retry_at",
    type: "datetime",
    precision: 3,
    nullable: true,
    comment: "Next scheduled retry timestamp (UTC)",
  })
  nextRetryAt: Date | null;
}
