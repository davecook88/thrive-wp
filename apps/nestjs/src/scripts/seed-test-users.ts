import { Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as bcrypt from "bcryptjs";

interface WordPressUserRow {
  ID: number;
}

interface InsertResult {
  insertId: number;
}

async function ensureWordPressUser(
  dataSource: DataSource,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  wpRole: string,
  logger: Logger,
): Promise<void> {
  // Check if user exists
  const result: WordPressUserRow[] = await dataSource.query(
    "SELECT ID FROM wp_users WHERE user_email = ?",
    [email],
  );

  if (result && result.length > 0) {
    const userId: number = result[0].ID;
    logger.log(`WordPress user ${email} already exists (ID: ${userId})`);

    // Update password using bcrypt (WordPress uses phpass which is bcrypt-based)
    const hashedPassword = await bcrypt.hash(password, 10);
    const userLogin = email;
    await dataSource.query(
      "UPDATE wp_users SET user_pass = ?, user_login = ? WHERE ID = ?",
      [hashedPassword, userLogin, userId],
    );

    // Update role
    const prefix = "wp_";
    await dataSource.query(
      `DELETE FROM ${prefix}usermeta WHERE user_id = ? AND meta_key = ?`,
      [userId, `${prefix}capabilities`],
    );
    await dataSource.query(
      `INSERT INTO ${prefix}usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)`,
      [userId, `${prefix}capabilities`, JSON.stringify({ [wpRole]: true })],
    );

    logger.log(`Updated WordPress user ${email} role to ${wpRole}`);
  } else {
    // Create new WordPress user
    const userLogin = email;
    const displayName = `${firstName} ${lastName}`.trim();

    // Hash password using bcrypt (WordPress uses phpass which is bcrypt-based)
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult: InsertResult = await dataSource.query(
      `INSERT INTO wp_users (user_login, user_email, user_pass, display_name, user_registered, user_status)
       VALUES (?, ?, ?, ?, NOW(), 0)`,
      [userLogin, email, hashedPassword, displayName],
    );

    const userId = insertResult.insertId;
    const prefix = "wp_";
    await dataSource.query(
      `INSERT INTO ${prefix}usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)`,
      [userId, `${prefix}capabilities`, JSON.stringify({ [wpRole]: true })],
    );

    logger.log(
      `Created WordPress user ${email} (ID: ${userId}) with role ${wpRole}`,
    );
  }
}

async function bootstrap() {
  const logger = new Logger("SeedTestUsers");

  // Set dummy env vars for Google Strategy if not present
  if (!process.env.GOOGLE_CLIENT_ID) process.env.GOOGLE_CLIENT_ID = "dummy_id";
  if (!process.env.GOOGLE_CLIENT_SECRET)
    process.env.GOOGLE_CLIENT_SECRET = "dummy_secret";
  if (!process.env.GOOGLE_CALLBACK_URL)
    process.env.GOOGLE_CALLBACK_URL =
      "http://localhost:3000/auth/google/callback";
  if (!process.env.STRIPE_SECRET_KEY)
    process.env.STRIPE_SECRET_KEY = "dummy_stripe_key";

  // Fall back to direct database setup
  const dataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    username: process.env.DB_USERNAME || "wordpress",
    password: process.env.DB_PASSWORD || "wordpress",
    database: process.env.DB_DATABASE || "wordpress",
  });

  try {
    await dataSource.initialize();
    logger.log("Database connection established");

    // Create WordPress admin user directly
    await ensureWordPressUser(
      dataSource,
      "admin@thrive.com",
      "thrive_test_123",
      "Test",
      "Admin",
      "administrator",
      logger,
    );

    logger.log("Seed complete!");
  } catch (error) {
    logger.error("Error during seed:", error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

bootstrap();
