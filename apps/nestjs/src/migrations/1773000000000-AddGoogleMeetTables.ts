import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AddGoogleMeetTables1773000000000 implements MigrationInterface {
  name = "AddGoogleMeetTables1773000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create teacher_google_credential table
    await queryRunner.createTable(
      new Table({
        name: "teacher_google_credential",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "teacher_id",
            type: "int",
            isUnique: true,
            comment: "FK to teacher.id (unique 1:1 with teacher)",
          },
          {
            name: "calendar_id",
            type: "varchar",
            length: "255",
            isNullable: true,
            comment: "Google Calendar ID (usually primary email)",
          },
          {
            name: "access_token_enc",
            type: "text",
            comment: "Encrypted access token",
          },
          {
            name: "refresh_token_enc",
            type: "text",
            comment: "Encrypted refresh token",
          },
          {
            name: "expires_at",
            type: "datetime",
            precision: 3,
            comment: "Access token expiration timestamp (UTC)",
          },
          {
            name: "scope",
            type: "varchar",
            length: "500",
            comment: "Granted OAuth scopes",
          },
          {
            name: "token_status",
            type: "enum",
            enum: ["VALID", "EXPIRED", "REVOKED", "ERROR"],
            default: "'VALID'",
            comment: "Current status of the OAuth token",
          },
          {
            name: "created_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "updated_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
            onUpdate: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "deleted_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ["teacher_id"],
            referencedTableName: "teacher",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
      true,
    );

    // Create index on teacher_id
    await queryRunner.createIndex(
      "teacher_google_credential",
      new TableIndex({
        name: "IDX_teacher_google_credential_teacher_id",
        columnNames: ["teacher_id"],
        isUnique: true,
      }),
    );

    // Create session_meet_event table
    await queryRunner.createTable(
      new Table({
        name: "session_meet_event",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "session_id",
            type: "int",
            isUnique: true,
            comment: "FK to session.id (unique 1:1 with session)",
          },
          {
            name: "google_event_id",
            type: "varchar",
            length: "255",
            isNullable: true,
            comment: "Google Calendar event ID",
          },
          {
            name: "hangout_link",
            type: "varchar",
            length: "500",
            isNullable: true,
            comment: "Google Meet URL",
          },
          {
            name: "conference_data_version",
            type: "int",
            default: 0,
            comment: "Version for conference data updates",
          },
          {
            name: "status",
            type: "enum",
            enum: [
              "PENDING",
              "CREATING",
              "READY",
              "UPDATING",
              "ERROR",
              "CANCELED",
            ],
            default: "'PENDING'",
            comment: "Meet event creation/sync status",
          },
          {
            name: "last_error",
            type: "text",
            isNullable: true,
            comment: "Last error message if status is ERROR",
          },
          {
            name: "retry_count",
            type: "int",
            default: 0,
            comment: "Number of retry attempts",
          },
          {
            name: "next_retry_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
            comment: "Next scheduled retry timestamp (UTC)",
          },
          {
            name: "created_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "updated_at",
            type: "datetime",
            precision: 3,
            default: "CURRENT_TIMESTAMP(3)",
            onUpdate: "CURRENT_TIMESTAMP(3)",
          },
          {
            name: "deleted_at",
            type: "datetime",
            precision: 3,
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ["session_id"],
            referencedTableName: "session",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
      true,
    );

    // Create indexes for session_meet_event
    await queryRunner.createIndex(
      "session_meet_event",
      new TableIndex({
        name: "IDX_session_meet_event_session_id",
        columnNames: ["session_id"],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      "session_meet_event",
      new TableIndex({
        name: "IDX_session_meet_event_status",
        columnNames: ["status"],
      }),
    );

    await queryRunner.createIndex(
      "session_meet_event",
      new TableIndex({
        name: "IDX_session_meet_event_next_retry",
        columnNames: ["next_retry_at"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex(
      "session_meet_event",
      "IDX_session_meet_event_next_retry",
    );
    await queryRunner.dropIndex(
      "session_meet_event",
      "IDX_session_meet_event_status",
    );
    await queryRunner.dropIndex(
      "session_meet_event",
      "IDX_session_meet_event_session_id",
    );
    await queryRunner.dropTable("session_meet_event");

    await queryRunner.dropIndex(
      "teacher_google_credential",
      "IDX_teacher_google_credential_teacher_id",
    );
    await queryRunner.dropTable("teacher_google_credential");
  }
}
