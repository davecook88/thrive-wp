import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TeacherAvailabilityKind } from '../entities/teacher-availability.entity.js';

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

  async validatePrivateSession({
    teacherId,
    startAt,
    endAt,
  }: {
    teacherId: number;
    startAt: string;
    endAt: string;
  }): Promise<ValidateAvailabilityResult> {
    // Raw SQL query to check teacher availability, blackouts, and existing bookings
    // Assumes tables: teacher, teacher_availability, classes (with snake_case columns)
    const sql = `
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
            SELECT 1 FROM classes c
            WHERE c.teacher_id = t.id
              AND c.start_at < ? AND c.end_at > ?
              AND c.deleted_at IS NULL
          ) THEN 1 ELSE 0
        END AS has_conflict
      FROM teacher t
      WHERE t.id = ? AND t.deleted_at IS NULL
      LIMIT 1;
    `;

    try {
      const results = await this.dataSource.query(sql, [
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
      ]);

      if (results.length === 0) {
        throw new NotFoundException(`Teacher ${teacherId} not found.`);
      }

      const row = results[0];

      if (!row.is_active) {
        throw new BadRequestException(`Teacher ${teacherId} is inactive.`);
      }

      if (row.has_blackout) {
        throw new BadRequestException(
          `Teacher ${teacherId} has a blackout during the requested time.`,
        );
      }

      if (!row.has_availability) {
        throw new BadRequestException(
          `Teacher ${teacherId} is not available during the requested time.`,
        );
      }

      if (row.has_conflict) {
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
        'Failed to validate session due to a database error.',
      );
    }
  }
}
