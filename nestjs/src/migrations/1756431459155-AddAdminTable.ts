import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add admin table for administrative users.
 * Creates admin table with one-to-one relationship to users.
 */
export class AddAdminTable1756431459155 implements MigrationInterface {
  name = 'AddAdminTable1756431459155';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id int NOT NULL AUTO_INCREMENT,
        user_id int NOT NULL COMMENT 'FK to user.id (unique 1:1 with user)',
        role varchar(100) NOT NULL DEFAULT 'admin' COMMENT 'Admin role/level (admin, super_admin, etc.)',
        is_active tinyint NOT NULL DEFAULT 1 COMMENT 'Whether the admin account is active',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_admin_user_id_unique (user_id),
        CONSTRAINT FK_admin_user_id FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS admin;');
  }
}
