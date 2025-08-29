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
        userId int NOT NULL COMMENT 'FK to users.id (unique 1:1 with users)',
        role varchar(100) NOT NULL DEFAULT 'admin' COMMENT 'Admin role/level (admin, super_admin, etc.)',
        isActive tinyint NOT NULL DEFAULT 1 COMMENT 'Whether the admin account is active',
        createdAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updatedAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deletedAt datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_admin_userId_unique (userId),
        CONSTRAINT FK_admin_userId FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS admin;');
  }
}
