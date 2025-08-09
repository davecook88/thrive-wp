import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema baseline migration.
 * Creates tables if they do not yet exist (idempotent style) and ensures indexes.
 * NOTE: Because WordPress shares the same database, we guard creations with IF NOT EXISTS.
 */
export class InitialSchema1733770000000 implements MigrationInterface {
  name = 'InitialSchema1733770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id int NOT NULL AUTO_INCREMENT,
        email varchar(255) NOT NULL COMMENT 'User email address (primary identifier)',
        firstName varchar(255) NULL COMMENT 'First name',
        lastName varchar(255) NULL COMMENT 'Last name',
        passwordHash varchar(255) NULL COMMENT 'Hashed password (null for OAuth users)',
        role enum('public','student','teacher','admin') NOT NULL DEFAULT 'student' COMMENT 'Primary user role',
        permissions json NULL COMMENT 'Additional permissions beyond base role',
        authProvider enum('local','google','wordpress') NOT NULL DEFAULT 'local' COMMENT 'Authentication provider used',
        externalId varchar(255) NULL COMMENT 'External provider user ID (Google, etc.)',
        wordpressUserId bigint NULL COMMENT 'WordPress user ID for sync purposes',
        emailVerified tinyint NOT NULL DEFAULT 0 COMMENT 'Email verification status',
        emailVerificationToken varchar(255) NULL COMMENT 'Email verification token',
        passwordResetToken varchar(255) NULL COMMENT 'Password reset token',
        passwordResetExpires datetime NULL COMMENT 'Password reset token expiry (UTC)',
        failedLoginAttempts int NOT NULL DEFAULT 0 COMMENT 'Failed login attempt counter',
        lockedUntil datetime NULL COMMENT 'Account lockout until timestamp (UTC)',
        lastLoginAt datetime NULL COMMENT 'Last successful login timestamp (UTC)',
        lastLoginIp varchar(45) NULL COMMENT 'Last login IP address',
        timezone varchar(255) NULL COMMENT 'User timezone for scheduling',
        preferredLanguage varchar(10) NOT NULL DEFAULT 'en' COMMENT 'Preferred language',
        isActive tinyint NOT NULL DEFAULT 1 COMMENT 'Account active status',
        teacherTier int NULL COMMENT 'Teacher tier level (10, 20, 30, etc.)',
        bio text NULL COMMENT 'Teacher bio/description',
        qualifications json NULL COMMENT 'Teacher qualifications and certifications',
        subjects json NULL COMMENT 'Subjects teacher can teach',
        createdAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updatedAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deletedAt datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_users_email_unique (email),
        KEY IDX_users_wordpressUserId (wordpressUserId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // classes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id int NOT NULL AUTO_INCREMENT,
        title varchar(255) NOT NULL COMMENT 'Class title/name',
        description text NULL COMMENT 'Class description',
        type enum('one-to-one','group','course') NOT NULL COMMENT 'Type of class',
        status enum('scheduled','in_progress','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled' COMMENT 'Current class status',
        teacherId int NOT NULL COMMENT 'Teacher ID conducting the class',
        subject varchar(100) NOT NULL COMMENT 'Subject/topic of the class',
        startTime datetime NOT NULL COMMENT 'Class start time (UTC)',
        endTime datetime NOT NULL COMMENT 'Class end time (UTC)',
        maxStudents int NOT NULL DEFAULT 1 COMMENT 'Maximum number of students',
        currentStudents int NOT NULL DEFAULT 0 COMMENT 'Current number of enrolled students',
        price decimal(10,2) NULL COMMENT 'Price per student (if applicable)',
        currency varchar(3) NOT NULL DEFAULT 'USD' COMMENT 'Currency code',
        platformUrl varchar(255) NULL COMMENT 'Google Classroom link or external platform URL',
        materials text NULL COMMENT 'Class materials and resources (JSON)',
        teacherNotes text NULL COMMENT 'Teacher notes for the class',
        studentNotes text NULL COMMENT 'Student feedback and notes',
        cancellationDeadline datetime NULL COMMENT 'Cancellation deadline (UTC)',
        allowsWaitlist tinyint NOT NULL DEFAULT 1 COMMENT 'Whether class allows waitlist',
        createdAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updatedAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deletedAt datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        KEY IDX_classes_teacherId (teacherId),
        KEY IDX_classes_startTime (startTime),
        KEY IDX_classes_status (status),
        CONSTRAINT FK_classes_teacher FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id int NOT NULL AUTO_INCREMENT,
        token varchar(255) NOT NULL COMMENT 'Refresh token value',
        userId int NOT NULL COMMENT 'User ID who owns this token',
        deviceId varchar(255) NULL COMMENT 'Device identifier for session tracking',
        userAgent varchar(255) NULL COMMENT 'User agent string',
        ipAddress varchar(45) NULL COMMENT 'IP address of the device',
        expiresAt datetime NOT NULL COMMENT 'Token expiration timestamp (UTC)',
        isRevoked tinyint NOT NULL DEFAULT 0 COMMENT 'Whether token has been revoked',
        lastUsedAt datetime NULL COMMENT 'Last used timestamp (UTC)',
        createdAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Record creation timestamp in UTC',
        updatedAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'Record last update timestamp in UTC',
        deletedAt datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_refresh_tokens_token_unique (token),
        KEY IDX_refresh_tokens_userId (userId),
        KEY IDX_refresh_tokens_device (deviceId),
        CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // If an older composite index exists (userId, deviceId) remove it safely
    const compositeIndex = await queryRunner.query(`
      SELECT INDEX_NAME FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'refresh_tokens'
        AND INDEX_NAME = 'IDX_8b2a6674489976688463b1abd2';
    `);
    if (compositeIndex.length) {
      // Drop FK, drop index, recreate FK (which will create its own userId index if needed)
      await queryRunner.query(
        `ALTER TABLE refresh_tokens DROP FOREIGN KEY FK_refresh_tokens_user;`,
      );
      await queryRunner.query(
        `DROP INDEX IDX_8b2a6674489976688463b1abd2 ON refresh_tokens;`,
      );
      // Ensure userId single-column index exists
      const userIdIndex = await queryRunner.query(`
        SELECT INDEX_NAME FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name='refresh_tokens' AND INDEX_NAME='IDX_refresh_tokens_userId';
      `);
      if (!userIdIndex.length) {
        await queryRunner.query(
          `CREATE INDEX IDX_refresh_tokens_userId ON refresh_tokens (userId);`,
        );
      }
      // Recreate FK
      await queryRunner.query(
        `ALTER TABLE refresh_tokens ADD CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down removes custom tables (not WordPress ones)
    await queryRunner.query('DROP TABLE IF EXISTS refresh_tokens;');
    await queryRunner.query('DROP TABLE IF EXISTS classes;');
    await queryRunner.query('DROP TABLE IF EXISTS users;');
  }
}
