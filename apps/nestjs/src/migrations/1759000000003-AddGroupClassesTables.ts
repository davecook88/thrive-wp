import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGroupClassesTables1759000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create level table
    await queryRunner.query(`
      CREATE TABLE level (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        INDEX idx_active (is_active),
        INDEX idx_sort (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed levels
    await queryRunner.query(`
      INSERT INTO level (code, name, description, sort_order) VALUES
        ('A1', 'Beginner A1', 'Can understand and use familiar everyday expressions', 10),
        ('A2', 'Elementary A2', 'Can communicate in simple and routine tasks', 20),
        ('B1', 'Intermediate B1', 'Can deal with most situations while traveling', 30),
        ('B2', 'Upper Intermediate B2', 'Can interact with a degree of fluency', 40),
        ('C1', 'Advanced C1', 'Can express ideas fluently and spontaneously', 50),
        ('C2', 'Proficiency C2', 'Can understand with ease virtually everything', 60)
    `);

    // Create group_class table
    await queryRunner.query(`
      CREATE TABLE group_class (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        level_id INT NOT NULL,
        capacity_max SMALLINT UNSIGNED NOT NULL DEFAULT 6,
        rrule VARCHAR(500) NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (level_id) REFERENCES level(id) ON DELETE RESTRICT,
        INDEX idx_level (level_id),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create group_class_teacher table
    await queryRunner.query(`
      CREATE TABLE group_class_teacher (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_class_id INT NOT NULL,
        teacher_id INT NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (group_class_id) REFERENCES group_class(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE RESTRICT,
        UNIQUE KEY unique_group_teacher (group_class_id, teacher_id),
        INDEX idx_group (group_class_id),
        INDEX idx_teacher (teacher_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Extend session table
    await queryRunner.query(`
      ALTER TABLE session
        ADD COLUMN group_class_id INT NULL,
        ADD CONSTRAINT fk_session_group_class
          FOREIGN KEY (group_class_id) REFERENCES group_class(id) ON DELETE SET NULL,
        ADD INDEX idx_group_class (group_class_id)
    `);

    // Extend waitlist table
    await queryRunner.query(`
      ALTER TABLE waitlist
        ADD COLUMN notified_at DATETIME(3) NULL,
        ADD COLUMN notification_expires_at DATETIME(3) NULL,
        ADD INDEX idx_notified (notified_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE waitlist DROP COLUMN notified_at, DROP COLUMN notification_expires_at`,
    );
    await queryRunner.query(
      `ALTER TABLE session DROP FOREIGN KEY fk_session_group_class`,
    );
    await queryRunner.query(`ALTER TABLE session DROP COLUMN group_class_id`);
    await queryRunner.query(`DROP TABLE group_class_teacher`);
    await queryRunner.query(`DROP TABLE group_class`);
    await queryRunner.query(`DROP TABLE level`);
  }
}
