import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
// import { TeacherAvailabilityKind } from '../entities/teacher-availability.entity.js';

export interface ValidateAvailabilityResult {
  valid: boolean;
  teacherId: number;
  reason?: string;
}

@Injectable()
export class TeacherAvailabilityService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async validateAvailability({
    teacherId,
    startAt,
    endAt,
    studentId,
  }: {
    teacherId: number;
    startAt: string;
    endAt: string;
    studentId?: number;
  }): Promise<ValidateAvailabilityResult> {
    // Raw SQL query to check teacher availability, blackouts, and existing bookings
    // Assumes tables: teacher, teacher_availability, session (with snake_case columns)
    // If a studentId is provided, ignore conflicts where the only overlapping session
    // has a PENDING booking belonging to that same student (this allows the same
    // student to re-run the create-session flow without being blocked by their
    // own previous draft/pending booking). When no studentId is provided we keep
    // the original strict conflict check.

    const sqlBase = `
      SELECT
        t.id AS teacher_id,
        t.is_active,
        t.deleted_at,
        -- Check for availability (ONE_OFF or RECURRING that matches the time)
        CASE
          WHEN EXISTS (
            SELECT 1 FROM teacher_availability ta
            WHERE ta.teacher_id = t.id
              AND ta.is_active = 1
              AND ta.deleted_at IS NULL
              AND ta.kind IN ('ONE_OFF', 'RECURRING')
              AND (
                (ta.kind = 'ONE_OFF' AND ta.start_at <= ? AND ta.end_at >= ?)
                OR (ta.kind = 'RECURRING' AND ta.weekday = (DAYOFWEEK(?) - 1) AND ta.start_time_minutes <= TIME_TO_SEC(TIME(?)) / 60 AND ta.end_time_minutes >= TIME_TO_SEC(TIME(?)) / 60)
              )
          ) THEN 1 ELSE 0
        END AS has_availability,
        -- Check for blackouts
        CASE
          WHEN EXISTS (
            SELECT 1 FROM teacher_availability ta
            WHERE ta.teacher_id = t.id
              AND ta.is_active = 1
              AND ta.deleted_at IS NULL
              AND ta.kind = 'BLACKOUT'
              AND ta.start_at <= ? AND ta.end_at >= ?
          ) THEN 1 ELSE 0
        END AS has_blackout,
        -- Check for conflicting bookings
        CASE
          WHEN EXISTS (
            SELECT 1 FROM session s
            WHERE s.teacher_id = t.id
              AND s.start_at < ? AND s.end_at > ?
              AND s.deleted_at IS NULL
          ) THEN 1 ELSE 0
        END AS has_conflict
      FROM teacher t
      WHERE t.id = ? AND t.deleted_at IS NULL
      LIMIT 1;
    `;

    // If studentId is provided we need to exclude sessions that only conflict
    // because they have a PENDING booking for the same student. Build a
    // slightly different SQL that LEFT JOINs booking and ignores those rows.
    let sql = sqlBase;
    let params: unknown[] = [];

    if (typeof studentId === "number") {
      sql = `
      SELECT
        t.id AS teacher_id,
        t.is_active,
        t.deleted_at,
        -- Check for availability (ONE_OFF or RECURRING that matches the time)
        CASE
          WHEN EXISTS (
            SELECT 1 FROM teacher_availability ta
            WHERE ta.teacher_id = t.id
              AND ta.is_active = 1
              AND ta.deleted_at IS NULL
              AND ta.kind IN ('ONE_OFF', 'RECURRING')
              AND (
                (ta.kind = 'ONE_OFF' AND ta.start_at <= ? AND ta.end_at >= ?)
                OR (ta.kind = 'RECURRING' AND ta.weekday = (DAYOFWEEK(?) - 1) AND ta.start_time_minutes <= TIME_TO_SEC(TIME(?)) / 60 AND ta.end_time_minutes >= TIME_TO_SEC(TIME(?)) / 60)
              )
          ) THEN 1 ELSE 0
        END AS has_availability,
        -- Check for blackouts
        CASE
          WHEN EXISTS (
            SELECT 1 FROM teacher_availability ta
            WHERE ta.teacher_id = t.id
              AND ta.is_active = 1
              AND ta.deleted_at IS NULL
              AND ta.kind = 'BLACKOUT'
              AND ta.start_at <= ? AND ta.end_at >= ?
          ) THEN 1 ELSE 0
        END AS has_blackout,
        -- Check for conflicting bookings (ignore conflicts caused by a PENDING booking by the same student)
        CASE
          WHEN EXISTS (
            SELECT 1 FROM session s
            LEFT JOIN booking b ON b.session_id = s.id
            WHERE s.teacher_id = t.id
              AND s.start_at < ? AND s.end_at > ?
              AND s.deleted_at IS NULL
              AND NOT (b.student_id = ? AND b.status = 'PENDING')
          ) THEN 1 ELSE 0
        END AS has_conflict
      FROM teacher t
      WHERE t.id = ? AND t.deleted_at IS NULL
      LIMIT 1;
      `;

      params = [
        startAt,
        endAt, // ONE_OFF
        startAt,
        startAt,
        endAt, // RECURRING
        startAt,
        endAt, // BLACKOUT
        endAt,
        startAt, // conflict window
        studentId, // exclude this student's pending booking
        teacherId,
      ];
    } else {
      // No studentId: original strict conflict check
      sql = sqlBase;
      params = [
        startAt,
        endAt, // For ONE_OFF availability
        startAt,
        startAt,
        endAt, // For RECURRING (weekday and time checks)
        startAt,
        endAt, // For BLACKOUT
        endAt,
        startAt, // For booking conflict
        teacherId,
      ];
    }

    try {
      const results: unknown = await this.dataSource.query(sql, params);

      // `results` is unknown from the raw query; assert as array of records for runtime checks
      const rows = Array.isArray(results)
        ? (results as Record<string, unknown>[])
        : [];

      if (rows.length === 0) {
        throw new NotFoundException(`Teacher ${teacherId} not found.`);
      }

      const row = rows[0];

      if (!row["is_active"]) {
        throw new BadRequestException(`Teacher ${teacherId} is inactive.`);
      }

      if (row["has_blackout"]) {
        throw new BadRequestException(
          `Teacher ${teacherId} has a blackout during the requested time.`,
        );
      }

      if (!row["has_availability"]) {
        throw new BadRequestException(
          `Teacher ${teacherId} is not available during the requested time.`,
        );
      }

      if (row["has_conflict"]) {
        throw new BadRequestException(
          `Teacher ${teacherId} has a conflicting booking during the requested time.`,
        );
      }

      // If we reach here, validation passes
      return { valid: true, teacherId };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to validate session due to a database error.",
      );
    }
  }
}
