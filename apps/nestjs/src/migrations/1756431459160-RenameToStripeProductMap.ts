import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Rename stripe_price_map to stripe_product_map and remove price-specific fields.
 * We now fetch prices dynamically from Stripe instead of storing them.
 */
export class RenameToStripeProductMap1756431459160
  implements MigrationInterface
{
  name = "RenameToStripeProductMap1756431459160";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create new stripe_product_map table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stripe_product_map (
        id int NOT NULL AUTO_INCREMENT,
        service_key varchar(120) NOT NULL COMMENT 'Human-readable key like PRIVATE_CLASS, GROUP_CLASS, COURSE_CLASS, or COURSE:123',
        stripe_product_id varchar(64) NOT NULL COMMENT 'Stripe Product ID',
        active tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether mapping is active',
        scope_type enum('course','session','package','service') NULL COMMENT 'Optional type classification',
        scope_id int NULL COMMENT 'Optional reference to internal ID',
        metadata json NULL COMMENT 'Additional metadata',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_stripe_product_map_service_key_unique (service_key),
        UNIQUE KEY IDX_stripe_product_map_stripe_product_id_unique (stripe_product_id),
        KEY IDX_stripe_product_map_active (active),
        KEY IDX_stripe_product_map_scope (scope_type, scope_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Migrate data from old table to new table (only if old table exists and has data)
    await queryRunner.query(`
      INSERT INTO stripe_product_map (service_key, stripe_product_id, active, scope_type, scope_id, metadata, created_at, updated_at)
      SELECT 
        price_key as service_key, 
        stripe_product_id, 
        active, 
        scope_type, 
        scope_id, 
        metadata, 
        created_at, 
        updated_at 
      FROM stripe_price_map 
      WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_price_map' AND table_schema = DATABASE());
    `);

    // Drop old table
    await queryRunner.query("DROP TABLE IF EXISTS stripe_price_map;");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate old stripe_price_map table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stripe_price_map (
        id int NOT NULL AUTO_INCREMENT,
        price_key varchar(120) NOT NULL COMMENT 'Human-readable key like ONE_ON_ONE, COURSE:123',
        stripe_product_id varchar(64) NOT NULL COMMENT 'Stripe Product ID',
        stripe_price_id varchar(64) NOT NULL COMMENT 'Stripe Price ID',
        currency char(3) NOT NULL DEFAULT 'USD' COMMENT 'Currency code',
        active tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether price is active',
        is_default tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Default price if multiple per key',
        scope_type enum('course','session','package','service') NULL COMMENT 'Optional type classification',
        scope_id int NULL COMMENT 'Optional reference to internal ID',
        metadata json NULL COMMENT 'Additional metadata from Stripe',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_stripe_price_map_price_key_unique (price_key),
        UNIQUE KEY IDX_stripe_price_map_stripe_price_id_unique (stripe_price_id),
        KEY IDX_stripe_price_map_active (active),
        KEY IDX_stripe_price_map_scope (scope_type, scope_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Migrate data back (note: will lose price_id and currency info)
    await queryRunner.query(`
      INSERT INTO stripe_price_map (price_key, stripe_product_id, stripe_price_id, currency, active, is_default, scope_type, scope_id, metadata, created_at, updated_at)
      SELECT 
        service_key as price_key, 
        stripe_product_id, 
        'price_PLACEHOLDER' as stripe_price_id,
        'USD' as currency,
        active, 
        true as is_default,
        scope_type, 
        scope_id, 
        metadata, 
        created_at, 
        updated_at 
      FROM stripe_product_map;
    `);

    // Drop new table
    await queryRunner.query("DROP TABLE IF EXISTS stripe_product_map;");
  }
}
