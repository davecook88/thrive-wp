import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add waitlist table for queuing students on full sessions.
 */
export class AddWaitlistTable1756431459158 implements MigrationInterface {
  name = "AddWaitlistTable1756431459158";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id int NOT NULL AUTO_INCREMENT,
        session_id int NOT NULL COMMENT 'FK to session.id',
        student_id int NOT NULL COMMENT 'FK to student.id',
        position int NOT NULL COMMENT 'Position in the waitlist queue',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_waitlist_session_student (session_id, student_id),
        KEY IDX_waitlist_session_position (session_id, position),
        CONSTRAINT FK_waitlist_session FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE,
        CONSTRAINT FK_waitlist_student FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS waitlist;");
  }
}
