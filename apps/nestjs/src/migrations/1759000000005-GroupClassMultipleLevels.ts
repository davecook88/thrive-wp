import { MigrationInterface, QueryRunner } from "typeorm";

export class GroupClassMultipleLevels1759000000005
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create group_class_level junction table
    await queryRunner.query(`
      CREATE TABLE group_class_level (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_class_id INT NOT NULL,
        level_id INT NOT NULL,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (group_class_id) REFERENCES group_class(id) ON DELETE CASCADE,
        FOREIGN KEY (level_id) REFERENCES level(id) ON DELETE RESTRICT,
        UNIQUE KEY unique_group_level (group_class_id, level_id),
        INDEX idx_group (group_class_id),
        INDEX idx_level (level_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Migrate existing level_id data to junction table
    await queryRunner.query(`
      INSERT INTO group_class_level (group_class_id, level_id)
      SELECT id, level_id FROM group_class WHERE level_id IS NOT NULL
    `);

    // Remove level_id foreign key constraint
    await queryRunner.query(`
      ALTER TABLE group_class DROP FOREIGN KEY group_class_ibfk_1
    `);

    // Remove level_id column
    await queryRunner.query(`
      ALTER TABLE group_class DROP COLUMN level_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add level_id column back
    await queryRunner.query(`
      ALTER TABLE group_class ADD COLUMN level_id INT NULL AFTER description
    `);

    // Migrate first level from junction table back to level_id
    await queryRunner.query(`
      UPDATE group_class gc
      SET gc.level_id = (
        SELECT level_id FROM group_class_level
        WHERE group_class_id = gc.id
        LIMIT 1
      )
    `);

    // Add foreign key constraint back
    await queryRunner.query(`
      ALTER TABLE group_class
        ADD CONSTRAINT group_class_ibfk_1
        FOREIGN KEY (level_id) REFERENCES level(id) ON DELETE RESTRICT
    `);

    // Drop junction table
    await queryRunner.query(`DROP TABLE group_class_level`);
  }
}
