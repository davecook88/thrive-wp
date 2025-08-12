import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds teachers & teacher_availability tables.
 * Guarded with IF NOT EXISTS to coexist with WordPress schema.
 */
export class AddTeacherAndAvailability1733772000002
  implements MigrationInterface
{
  name = 'AddTeacherAndAvailability1733772000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id int NOT NULL AUTO_INCREMENT,
        userId int NOT NULL COMMENT 'FK to users.id (unique 1:1 with users)',
        tier smallint unsigned NOT NULL DEFAULT 10 COMMENT 'Teacher tier (10,20,30...) used for pricing & access control',
        bio text NULL COMMENT 'Public biography / profile information',
        isActive tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the teacher is active & selectable for scheduling',
        createdAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updatedAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deletedAt datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_teachers_userId_unique (userId),
        KEY IDX_teachers_tier (tier),
        CONSTRAINT FK_teachers_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teacher_availability (
        id int NOT NULL AUTO_INCREMENT,
        teacherId int NOT NULL COMMENT 'FK to teachers.id',
        kind enum('ONE_OFF','RECURRING','BLACKOUT') NOT NULL COMMENT 'Type of availability window',
        weekday tinyint NULL COMMENT '0=Sunday .. 6=Saturday (RECURRING only)',
        startTimeMinutes smallint unsigned NULL COMMENT 'Start minutes from 00:00 UTC (RECURRING only)',
        endTimeMinutes smallint unsigned NULL COMMENT 'End minutes from 00:00 UTC (RECURRING only)',
        startAt datetime(3) NULL COMMENT 'UTC start datetime (ONE_OFF/BLACKOUT)',
        endAt datetime(3) NULL COMMENT 'UTC end datetime (ONE_OFF/BLACKOUT)',
        isActive tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether this availability entry is active',
        createdAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updatedAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deletedAt datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        KEY IDX_teacher_availability_teacherId (teacherId),
        KEY IDX_teacher_availability_teacherId_kind (teacherId, kind),
        KEY IDX_teacher_availability_teacherId_weekday_start (teacherId, weekday, startTimeMinutes),
        CONSTRAINT FK_teacher_availability_teacherId FOREIGN KEY (teacherId) REFERENCES teachers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS teacher_availability;');
    await queryRunner.query('DROP TABLE IF EXISTS teachers;');
  }
}
