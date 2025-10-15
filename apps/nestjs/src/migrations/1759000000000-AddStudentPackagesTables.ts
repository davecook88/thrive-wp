import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentPackagesTables1759000000000
  implements MigrationInterface
{
  name = 'AddStudentPackagesTables1759000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE student_package (
        id int PRIMARY KEY AUTO_INCREMENT,
        student_id int NOT NULL,
        package_name varchar(255) NOT NULL,
        total_sessions int NOT NULL DEFAULT 0,
        remaining_sessions int NOT NULL DEFAULT 0,
        purchased_at datetime(3) NOT NULL,
        expires_at datetime(3) NULL,
        source_payment_id varchar(255) NULL,
        metadata json NULL,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at datetime(3) NULL,
        INDEX (student_id),
        CONSTRAINT fk_student_package_student FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE package_use (
        id int PRIMARY KEY AUTO_INCREMENT,
        student_package_id int NOT NULL,
        booking_id int NULL,
        session_id int NULL,
        used_at datetime(3) NOT NULL,
        used_by int NULL,
        note varchar(500) NULL,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at datetime(3) NULL,
        INDEX (student_package_id),
        CONSTRAINT fk_package_use_student_package FOREIGN KEY (student_package_id) REFERENCES student_package(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS package_use;`);
    await queryRunner.query(`DROP TABLE IF EXISTS student_package;`);
  }
}
