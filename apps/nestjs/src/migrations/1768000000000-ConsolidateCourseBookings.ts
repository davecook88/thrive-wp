import { MigrationInterface, QueryRunner } from "typeorm";

interface ColumnInfo {
  COLUMN_NAME: string;
}

interface ConstraintInfo {
  CONSTRAINT_NAME: string;
}

export class ConsolidateCourseBookings1768000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check which columns already exist in booking table
    const bookingColumns: ColumnInfo[] = (await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "booking"
    `)) as ColumnInfo[];
    const bookingColumnNames = bookingColumns.map(
      (col: ColumnInfo) => col.COLUMN_NAME,
    );

    // Step 1: Add booking_type enum and new fields to booking table (if they don't exist)
    if (!bookingColumnNames.includes("booking_type")) {
      await queryRunner.query(`
        ALTER TABLE booking
        ADD COLUMN booking_type ENUM('DROP_IN', 'COURSE_STEP', 'WORKSHOP') NOT NULL DEFAULT 'DROP_IN'
        COMMENT 'Type of booking (drop-in, course step, workshop)'
        AFTER cancelled_by_student
      `);
    }

    if (!bookingColumnNames.includes("course_step_id")) {
      await queryRunner.query(`
        ALTER TABLE booking
        ADD COLUMN course_step_id INT NULL
        COMMENT 'FK to course_step.id for COURSE_STEP bookings'
        AFTER booking_type,
        ADD INDEX idx_booking_course_step_id (course_step_id)
      `);
    }

    if (!bookingColumnNames.includes("metadata")) {
      await queryRunner.query(`
        ALTER TABLE booking
        ADD COLUMN metadata JSON NULL
        COMMENT 'Additional booking metadata (extensible)'
        AFTER course_step_id
      `);
    }

    // Check which columns already exist in student_course_step_progress table
    const progressColumns: ColumnInfo[] = (await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "student_course_step_progress"
    `)) as ColumnInfo[];
    const progressColumnNames = progressColumns.map(
      (col: ColumnInfo) => col.COLUMN_NAME,
    );

    // Step 2: Add booking_id FK to student_course_step_progress table (if it doesn't exist)
    if (!progressColumnNames.includes("booking_id")) {
      await queryRunner.query(`
        ALTER TABLE student_course_step_progress
        ADD COLUMN booking_id INT NULL
        COMMENT 'FK to booking.id - links to the actual booking entity'
        AFTER status,
        ADD INDEX idx_scsp_booking_id (booking_id)
      `);
    }

    // Step 3: Add foreign key constraint (if it doesn't exist)
    const constraints: ConstraintInfo[] = (await queryRunner.query(`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = "student_course_step_progress"
        AND COLUMN_NAME = "booking_id"
        AND REFERENCED_TABLE_NAME = "booking"
    `)) as ConstraintInfo[];

    if (constraints.length === 0) {
      await queryRunner.query(`
        ALTER TABLE student_course_step_progress
        ADD CONSTRAINT fk_scsp_booking
        FOREIGN KEY (booking_id) REFERENCES booking(id)
        ON DELETE SET NULL
      `);
    }

    // Step 4: Update comment on session_id to mark as deprecated
    await queryRunner.query(`
      ALTER TABLE student_course_step_progress
      MODIFY COLUMN session_id INT NULL
      COMMENT "DEPRECATED: Use booking.sessionId instead. Kept for backward compatibility."
    `);

    // Step 5: Backfill - Create Booking entities for existing BOOKED progress records
    // This finds all BOOKED progress records without a bookingId and creates corresponding bookings
    await queryRunner.query(`
      INSERT INTO booking (
        session_id,
        student_id,
        status,
        booking_type,
        course_step_id,
        student_package_id,
        metadata,
        created_at,
        updated_at
      )
      SELECT
        scsp.session_id,
        sp.student_id,
        'CONFIRMED',
        'COURSE_STEP',
        scsp.course_step_id,
        scsp.student_package_id,
        JSON_OBJECT(
          'backfilled', true,
          'originalBookedAt', scsp.booked_at,
          'cohortId', scsp.cohort_id
        ),
        COALESCE(scsp.booked_at, scsp.created_at),
        NOW()
      FROM student_course_step_progress scsp
      JOIN student_package sp ON scsp.student_package_id = sp.id
      WHERE scsp.status IN ('BOOKED', 'COMPLETED', 'MISSED')
        AND scsp.booking_id IS NULL
        AND scsp.session_id IS NOT NULL
    `);

    // Step 6: Update progress records with their new bookingId references
    await queryRunner.query(`
      UPDATE student_course_step_progress scsp
      INNER JOIN booking b ON
        b.course_step_id = scsp.course_step_id
        AND b.student_package_id = scsp.student_package_id
        AND b.booking_type = 'COURSE_STEP'
        AND b.session_id = scsp.session_id
      SET scsp.booking_id = b.id
      WHERE scsp.booking_id IS NULL
        AND scsp.status IN ('BOOKED', 'COMPLETED', 'MISSED')
        AND JSON_EXTRACT(b.metadata, '$.backfilled') = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraint
    await queryRunner.query(`
      ALTER TABLE student_course_step_progress
      DROP FOREIGN KEY fk_scsp_booking
    `);

    // Remove booking_id column from student_course_step_progress
    await queryRunner.query(`
      ALTER TABLE student_course_step_progress
      DROP COLUMN booking_id
    `);

    // Restore session_id comment
    await queryRunner.query(`
      ALTER TABLE student_course_step_progress
      MODIFY COLUMN session_id INT NULL
      COMMENT 'FK to session.id when step has been booked'
    `);

    // Delete backfilled course booking records
    await queryRunner.query(`
      DELETE FROM booking
      WHERE booking_type = 'COURSE_STEP'
        AND metadata->>'$.backfilled' = 'true'
    `);

    // Remove new columns from booking table
    await queryRunner.query(`
      ALTER TABLE booking
      DROP COLUMN metadata,
      DROP COLUMN course_step_id,
      DROP COLUMN booking_type
    `);
  }
}
