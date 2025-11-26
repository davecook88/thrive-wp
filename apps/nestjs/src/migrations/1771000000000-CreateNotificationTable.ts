import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationTable1771000000000
  implements MigrationInterface
{
  name = "CreateNotificationTable1771000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification (
        id int NOT NULL AUTO_INCREMENT,
        user_id int NOT NULL COMMENT 'FK to user.id',
        type varchar(255) NOT NULL COMMENT 'Notification type',
        data json NULL COMMENT 'Notification data',
        is_read tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether the notification has been read',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        PRIMARY KEY (id),
        KEY IDX_notification_user (user_id),
        CONSTRAINT FK_notification_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS notification;");
  }
}
