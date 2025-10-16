import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds teachers & teacher_availability tables.
 * Guarded with IF NOT EXISTS to coexist with WordPress schema.
 */
export class AddTeacherAndAvailability1733772000002
  implements MigrationInterface
{
  name = "AddTeacherAndAvailability1733772000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teacher (
        id int NOT NULL AUTO_INCREMENT,
        user_id int NOT NULL COMMENT 'FK to user.id (unique 1:1 with user)',
        tier smallint unsigned NOT NULL DEFAULT 10 COMMENT 'Teacher tier (10,20,30...) used for pricing & access control',
        bio text NULL COMMENT 'Public biography / profile information',
        is_active tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the teacher is active & selectable for scheduling',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_teachers_user_id_unique (user_id),
        KEY IDX_teachers_tier (tier),
        CONSTRAINT FK_teachers_user_id FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teacher_availability (
        id int NOT NULL AUTO_INCREMENT,
        teacher_id int NOT NULL COMMENT 'FK to teacher.id',
        kind enum('ONE_OFF','RECURRING','BLACKOUT') NOT NULL COMMENT 'Type of availability window',
        weekday tinyint NULL COMMENT '0=Sunday .. 6=Saturday (RECURRING only)',
        start_time_minutes smallint unsigned NULL COMMENT 'Start minutes from 00:00 UTC (RECURRING only)',
        end_time_minutes smallint unsigned NULL COMMENT 'End minutes from 00:00 UTC (RECURRING only)',
        start_at datetime(3) NULL COMMENT 'UTC start datetime (ONE_OFF/BLACKOUT)',
        end_at datetime(3) NULL COMMENT 'UTC end datetime (ONE_OFF/BLACKOUT)',
        is_active tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this availability entry is active',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        KEY IDX_teacher_availability_teacher_id (teacher_id),
        KEY IDX_teacher_availability_teacher_id_kind (teacher_id, kind),
        KEY IDX_teacher_availability_teacher_id_weekday_start (teacher_id, weekday, start_time_minutes),
        CONSTRAINT FK_teacher_availability_teacher_id FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS teacher_availability;");
    await queryRunner.query("DROP TABLE IF EXISTS teacher;");
  }
}
