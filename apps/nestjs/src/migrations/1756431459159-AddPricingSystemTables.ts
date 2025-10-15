import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add pricing system tables: stripe_price_map, order, order_item
 * Implements the Stripe-as-source-of-truth pricing system per pricing-system-plan.md
 */
export class AddPricingSystemTables1756431459159 implements MigrationInterface {
  name = 'AddPricingSystemTables1756431459159';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create stripe_price_map table
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

    // Create order table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`order\` (
        id int NOT NULL AUTO_INCREMENT,
        student_id int NOT NULL COMMENT 'FK to student.id',
        status enum('pending','requires_payment','paid','cancelled','refunded','failed') NOT NULL DEFAULT 'pending' COMMENT 'Order status',
        currency char(3) NOT NULL DEFAULT 'USD' COMMENT 'Currency code',
        subtotal_minor int NOT NULL COMMENT 'Subtotal in minor currency units (cents)',
        discount_minor int NOT NULL DEFAULT 0 COMMENT 'Discount in minor currency units',
        tax_minor int NOT NULL DEFAULT 0 COMMENT 'Tax in minor currency units',
        total_minor int NOT NULL COMMENT 'Total in minor currency units',
        stripe_payment_intent_id varchar(64) NULL COMMENT 'Stripe PaymentIntent ID',
        stripe_customer_id varchar(64) NULL COMMENT 'Stripe Customer ID',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_order_stripe_payment_intent_unique (stripe_payment_intent_id),
        KEY IDX_order_student (student_id),
        KEY IDX_order_status (status),
        CONSTRAINT FK_order_student FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create order_item table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_item (
        id int NOT NULL AUTO_INCREMENT,
        order_id int NOT NULL COMMENT 'FK to order.id',
        item_type enum('session','course','package','service') NOT NULL COMMENT 'Type of item being purchased',
        item_ref varchar(120) NOT NULL COMMENT 'Reference key like ONE_ON_ONE, COURSE:123',
        title varchar(200) NOT NULL COMMENT 'Display title snapshot',
        quantity int NOT NULL DEFAULT 1 COMMENT 'Quantity purchased',
        amount_minor int NOT NULL COMMENT 'Unit amount in minor currency units',
        currency char(3) NOT NULL DEFAULT 'USD' COMMENT 'Currency code',
        stripe_price_id varchar(64) NOT NULL COMMENT 'Stripe Price ID used',
        metadata json NULL COMMENT 'Additional item metadata',
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        PRIMARY KEY (id),
        KEY IDX_order_item_order (order_id),
        KEY IDX_order_item_type_ref (item_type, item_ref),
        CONSTRAINT FK_order_item_order FOREIGN KEY (order_id) REFERENCES \`order\`(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Add stripe_customer_id to student table
    await queryRunner.query(`
      ALTER TABLE student 
      ADD COLUMN stripe_customer_id varchar(64) NULL COMMENT 'Stripe Customer ID for reuse'
      AFTER user_id;
    `);

    await queryRunner.query(`
      ALTER TABLE student 
      ADD UNIQUE KEY IDX_student_stripe_customer_id_unique (stripe_customer_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove stripe_customer_id from student table
    await queryRunner.query(
      'ALTER TABLE student DROP KEY IDX_student_stripe_customer_id_unique;',
    );
    await queryRunner.query(
      'ALTER TABLE student DROP COLUMN stripe_customer_id;',
    );

    // Drop tables in reverse order to handle foreign keys
    await queryRunner.query('DROP TABLE IF EXISTS order_item;');
    await queryRunner.query('DROP TABLE IF EXISTS `order`;');
    await queryRunner.query('DROP TABLE IF EXISTS stripe_price_map;');
  }
}
