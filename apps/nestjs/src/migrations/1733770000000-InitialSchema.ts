import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Initial schema baseline migration.
 * Creates tables if they do not yet exist (idempotent style) and ensures indexes.
 * NOTE: Because WordPress shares the same database, we guard creations with IF NOT EXISTS.
 */
export class InitialSchema1733770000000 implements MigrationInterface {
  name = "InitialSchema1733770000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user (
        id int NOT NULL AUTO_INCREMENT,
        email varchar(255) NOT NULL COMMENT 'User email address (primary identifier)',
        first_name varchar(255) NOT NULL COMMENT 'User first name',
        last_name varchar(255) NOT NULL COMMENT 'User last name',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_users_email_unique (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop simplified users table
    await queryRunner.query("DROP TABLE IF EXISTS users;");
  }
}
