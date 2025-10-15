import { describe, beforeEach, afterEach, it, expect, beforeAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { TeacherAvailabilityService } from "../src/teachers/services/teacher-availability.service.js";
import { TeachersService } from "../src/teachers/teachers.service.js";
import { TeacherAvailabilityKind } from "../src/teachers/entities/teacher-availability.entity.js";
import { ServiceType } from "../src/common/types/class-types.js";
import { SessionStatus } from "../src/sessions/entities/session.entity.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Teacher } from "../src/teachers/entities/teacher.entity.js";
import { TeacherAvailability } from "../src/teachers/entities/teacher-availability.entity.js";
import { Session } from "../src/sessions/entities/session.entity.js";
import { resetDatabase } from "./utils/reset-db.js";
import { execInsert } from "./utils/query-helpers.js";
import { runMigrations } from "./setup.js";

describe("TeacherAvailabilityService (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let service: TeacherAvailabilityService;
  let teachersService: TeachersService;

  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forFeature([Teacher, TeacherAvailability, Session]),
      ],
      providers: [TeacherAvailabilityService, TeachersService],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get(DataSource);
    service = moduleFixture.get(TeacherAvailabilityService);
    teachersService = moduleFixture.get(TeachersService);
    await app.init();
    await resetDatabase(dataSource);
  }, 30000);

  afterEach(async () => {
    await app.close();
  });

  describe("validateAvailability", () => {
    let teacherId: number;
    let userId: number;

    beforeEach(async () => {
      // Create a test user & teacher for each test (DB is truncated beforehand)
      userId = await execInsert(
        dataSource,
        "INSERT INTO user (email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        ["test@example.com", "Test", "User"],
      );
      teacherId = await execInsert(
        dataSource,
        "INSERT INTO teacher (user_id, tier, bio, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [userId, 10, "Test bio", true],
      );
    });

    it("should validate successfully when teacher has ONE_OFF availability", async () => {
      // Create ONE_OFF availability for the teacher
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, start_at, end_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [
          teacherId,
          TeacherAvailabilityKind.ONE_OFF,
          "2024-01-15 10:00:00",
          "2024-01-15 11:00:00",
          true,
        ],
      );

      const result = await service.validateAvailability({
        teacherId,
        startAt: "2024-01-15T10:30:00.000Z",
        endAt: "2024-01-15T11:00:00.000Z",
      });

      expect(result).toEqual({
        valid: true,
        teacherId,
      });
    });

    it("should validate successfully when teacher has RECURRING availability", async () => {
      // Create RECURRING availability for Monday (weekday 1) from 10:00 to 11:00
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [teacherId, TeacherAvailabilityKind.RECURRING, 1, 600, 660, true], // Monday 10:00-11:00
      );

      const result = await service.validateAvailability({
        teacherId,
        startAt: "2024-01-15T10:30:00.000Z", // Monday Jan 15, 2024
        endAt: "2024-01-15T11:00:00.000Z",
      });

      expect(result).toEqual({
        valid: true,
        teacherId,
      });
    });

    it("should fail when teacher has a blackout during requested time", async () => {
      // Create availability
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, start_at, end_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [
          teacherId,
          TeacherAvailabilityKind.ONE_OFF,
          "2024-01-15 10:00:00",
          "2024-01-15 11:00:00",
          true,
        ],
      );

      // Create blackout
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, start_at, end_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [
          teacherId,
          TeacherAvailabilityKind.BLACKOUT,
          "2024-01-15 10:30:00",
          "2024-01-15 10:45:00",
          true,
        ],
      );

      await expect(
        service.validateAvailability({
          teacherId,
          startAt: "2024-01-15T10:30:00.000Z",
          endAt: "2024-01-15T10:45:00.000Z",
        }),
      ).rejects.toThrow("Teacher 1 has a blackout during the requested time.");
    });

    it("should fail when teacher has a conflicting booking", async () => {
      // Create availability
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, start_at, end_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [
          teacherId,
          TeacherAvailabilityKind.ONE_OFF,
          "2024-01-15 10:00:00",
          "2024-01-15 11:00:00",
          true,
        ],
      );

      // Create conflicting session
      await dataSource.query(
        "INSERT INTO session (type, teacher_id, start_at, end_at, capacity_max, status, visibility, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          ServiceType.PRIVATE,
          teacherId,
          "2024-01-15 10:15:00",
          "2024-01-15 10:45:00",
          1,
          "SCHEDULED",
          "PRIVATE",
        ],
      );

      await expect(
        service.validateAvailability({
          teacherId,
          startAt: "2024-01-15T10:30:00.000Z",
          endAt: "2024-01-15T11:00:00.000Z",
        }),
      ).rejects.toThrow(
        "Teacher 1 has a conflicting booking during the requested time.",
      );
    });

    it("should fail when teacher is inactive", async () => {
      // Update teacher to be inactive
      await dataSource.query("UPDATE teacher SET is_active = 0 WHERE id = ?", [
        teacherId,
      ]);

      await expect(
        service.validateAvailability({
          teacherId,
          startAt: "2024-01-15T10:30:00.000Z",
          endAt: "2024-01-15T11:00:00.000Z",
        }),
      ).rejects.toThrow("Teacher 1 is inactive.");
    });

    it("should fail when teacher does not exist", async () => {
      const nonExistentTeacherId = 99999;

      await expect(
        service.validateAvailability({
          teacherId: nonExistentTeacherId,
          startAt: "2024-01-15T10:30:00.000Z",
          endAt: "2024-01-15T11:00:00.000Z",
        }),
      ).rejects.toThrow("Teacher 99999 not found.");
    });

    it("should fail when teacher has no availability", async () => {
      await expect(
        service.validateAvailability({
          teacherId,
          startAt: "2024-01-15T10:30:00.000Z",
          endAt: "2024-01-15T11:00:00.000Z",
        }),
      ).rejects.toThrow(
        "Teacher 1 is not available during the requested time.",
      );
    });

    it("should fail when RECURRING availability weekday does not match", async () => {
      // Create RECURRING availability for Monday (weekday 1)
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [teacherId, TeacherAvailabilityKind.RECURRING, 1, 600, 660, true], // Monday 10:00-11:00
      );

      // Try to book on Tuesday (weekday 2)
      await expect(
        service.validateAvailability({
          teacherId,
          startAt: "2024-01-16T10:30:00.000Z", // Tuesday Jan 16, 2024
          endAt: "2024-01-16T11:00:00.000Z",
        }),
      ).rejects.toThrow(
        "Teacher 1 is not available during the requested time.",
      );
    });

    it("should fail when RECURRING availability time does not match", async () => {
      // Create RECURRING availability for Monday 10:00-11:00
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [teacherId, TeacherAvailabilityKind.RECURRING, 1, 600, 660, true], // Monday 10:00-11:00
      );

      // Try to book at 9:00-9:30 (before availability)
      await expect(
        service.validateAvailability({
          teacherId,
          startAt: "2024-01-15T09:00:00.000Z", // Monday Jan 15, 2024
          endAt: "2024-01-15T09:30:00.000Z",
        }),
      ).rejects.toThrow(
        "Teacher 1 is not available during the requested time.",
      );
    });
  });

  describe("previewTeacherAvailability (integration)", () => {
    let teacherId: number;
    let userId: number;

    beforeEach(async () => {
      userId = await execInsert(
        dataSource,
        "INSERT INTO user (email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        ["preview-test@example.com", "Preview", "Test"],
      );
      teacherId = await execInsert(
        dataSource,
        "INSERT INTO teacher (user_id, tier, bio, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [userId, 10, "Preview test bio", true],
      );
    });

    it("should correctly exclude time slots that overlap with scheduled sessions", async () => {
      // Create recurring availability for Monday (weekday 1) from 9:00 to 17:00
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [teacherId, TeacherAvailabilityKind.RECURRING, 1, 540, 1020, true], // Monday 9:00-17:00
      );

      // Verify the data was created
      await dataSource.query(
        "SELECT * FROM teacher_availability WHERE teacher_id = ?",
        [teacherId],
      );
      // console.debug('Created availability record(s)');

      // Create a scheduled session that overlaps with part of the availability
      // Monday, January 13, 2025 from 10:00 to 11:00
      await dataSource.query(
        "INSERT INTO session (type, teacher_id, start_at, end_at, capacity_max, status, visibility, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          ServiceType.PRIVATE,
          teacherId,
          "2025-01-13 10:00:00", // Monday Jan 13, 2025
          "2025-01-13 11:00:00",
          1,
          SessionStatus.SCHEDULED,
          "PRIVATE",
        ],
      );

      // Verify the session was created
      await dataSource.query("SELECT * FROM session WHERE teacher_id = ?", [
        teacherId,
      ]);
      // console.debug('Created session record(s)');

      // Create another scheduled session that overlaps with a different part
      // Monday, January 13, 2025 from 14:00 to 15:30
      await dataSource.query(
        "INSERT INTO session (type, teacher_id, start_at, end_at, capacity_max, status, visibility, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          ServiceType.PRIVATE,
          teacherId,
          "2025-01-13 14:00:00",
          "2025-01-13 15:30:00",
          1,
          SessionStatus.SCHEDULED,
          "PRIVATE",
        ],
      );

      // Preview availability for Monday, January 13, 2025
      const result = await teachersService.previewTeacherAvailability(
        [teacherId],
        {
          start: "2025-01-13T00:00:00.000Z",
          end: "2025-01-13T23:59:59.999Z",
          teacherIds: [teacherId],
        },
      );

      // console.debug('Preview result retrieved');

      // Should have availability windows that exclude the booked times
      expect(result.windows).toBeDefined();
      expect(Array.isArray(result.windows)).toBe(true);

      // Sort windows by start time for easier testing
      const sortedWindows = result.windows.sort((a, b) =>
        a.start.localeCompare(b.start),
      );

      // Expected windows should be:
      // 1. 9:00-10:00 (before first booking)
      // 2. 11:00-14:00 (between bookings)
      // 3. 15:30-17:00 (after second booking)

      expect(sortedWindows).toHaveLength(3);

      // First window: 9:00-10:00
      expect(sortedWindows[0].start).toBe("2025-01-13T09:00:00.000Z");
      expect(sortedWindows[0].end).toBe("2025-01-13T10:00:00.000Z");
      expect(sortedWindows[0].teacherIds).toEqual([teacherId]);

      // Second window: 11:00-14:00
      expect(sortedWindows[1].start).toBe("2025-01-13T11:00:00.000Z");
      expect(sortedWindows[1].end).toBe("2025-01-13T14:00:00.000Z");
      expect(sortedWindows[1].teacherIds).toEqual([teacherId]);

      // Third window: 15:30-17:00
      expect(sortedWindows[2].start).toBe("2025-01-13T15:30:00.000Z");
      expect(sortedWindows[2].end).toBe("2025-01-13T17:00:00.000Z");
      expect(sortedWindows[2].teacherIds).toEqual([teacherId]);
    });

    it("should include full availability when no sessions are scheduled", async () => {
      // Create recurring availability for Tuesday (weekday 2) from 10:00 to 16:00
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [teacherId, TeacherAvailabilityKind.RECURRING, 2, 600, 960, true], // Tuesday 10:00-16:00
      );

      // No scheduled sessions for this day

      // Preview availability for Tuesday, January 14, 2025
      const result = await teachersService.previewTeacherAvailability(
        [teacherId],
        {
          start: "2025-01-14T00:00:00.000Z",
          end: "2025-01-14T23:59:59.999Z",
          teacherIds: [teacherId],
        },
      );

      // Should have one continuous availability window
      expect(result.windows).toHaveLength(1);
      expect(result.windows[0].start).toBe("2025-01-14T10:00:00.000Z");
      expect(result.windows[0].end).toBe("2025-01-14T16:00:00.000Z");
      expect(result.windows[0].teacherIds).toEqual([teacherId]);
    });

    it("should exclude time slots that overlap with blackouts", async () => {
      // Create recurring availability for Wednesday (weekday 3) from 9:00 to 17:00
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [teacherId, TeacherAvailabilityKind.RECURRING, 3, 540, 1020, true], // Wednesday 9:00-17:00
      );

      // Create a blackout for Wednesday, January 15, 2025 from 12:00 to 13:00
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, start_at, end_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [
          teacherId,
          TeacherAvailabilityKind.BLACKOUT,
          "2025-01-15 12:00:00",
          "2025-01-15 13:00:00",
          true,
        ],
      );

      // Preview availability for Wednesday, January 15, 2025
      const result = await teachersService.previewTeacherAvailability(
        [teacherId],
        {
          start: "2025-01-15T00:00:00.000Z",
          end: "2025-01-15T23:59:59.999Z",
          teacherIds: [teacherId],
        },
      );

      // Should have two windows: 9:00-12:00 and 13:00-17:00
      expect(result.windows).toHaveLength(2);

      const sortedWindows = result.windows.sort((a, b) =>
        a.start.localeCompare(b.start),
      );

      expect(sortedWindows[0].start).toBe("2025-01-15T09:00:00.000Z");
      expect(sortedWindows[0].end).toBe("2025-01-15T12:00:00.000Z");

      expect(sortedWindows[1].start).toBe("2025-01-15T13:00:00.000Z");
      expect(sortedWindows[1].end).toBe("2025-01-15T17:00:00.000Z");
    });

    it("should handle multiple teachers with different availabilities and bookings", async () => {
      // Create a second teacher
      const userId2 = await execInsert(
        dataSource,
        "INSERT INTO user (email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        ["preview-test2@example.com", "Preview2", "Test2"],
      );
      const teacherId2 = await execInsert(
        dataSource,
        "INSERT INTO teacher (user_id, tier, bio, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [userId2, 10, "Preview test bio 2", true],
      );

      // Create availability for first teacher (Monday 9:00-17:00)
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [teacherId, TeacherAvailabilityKind.RECURRING, 1, 540, 1020, true],
      );

      // Create availability for second teacher (Monday 10:00-18:00)
      await dataSource.query(
        "INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [teacherId2, TeacherAvailabilityKind.RECURRING, 1, 600, 1080, true],
      );

      // Create a booking for first teacher from 11:00-12:00
      await dataSource.query(
        "INSERT INTO session (type, teacher_id, start_at, end_at, capacity_max, status, visibility, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          ServiceType.PRIVATE,
          teacherId,
          "2025-01-13 11:00:00",
          "2025-01-13 12:00:00",
          1,
          SessionStatus.SCHEDULED,
          "PRIVATE",
        ],
      );

      // Preview availability for both teachers on Monday, January 13, 2025
      const result = await teachersService.previewTeacherAvailability(
        [teacherId, teacherId2],
        {
          start: "2025-01-13T00:00:00.000Z",
          end: "2025-01-13T23:59:59.999Z",
          teacherIds: [teacherId, teacherId2],
        },
      );

      // Should have windows showing combined availability
      expect(result.windows.length).toBeGreaterThan(0);

      // Verify that the 11:00-12:00 slot only shows teacherId2 (since teacherId has a booking)
      const elevenToTwelveWindow = result.windows.find(
        (w) =>
          w.start === "2025-01-13T11:00:00.000Z" &&
          w.end === "2025-01-13T12:00:00.000Z",
      );
      expect(elevenToTwelveWindow).toBeDefined();
      expect(elevenToTwelveWindow!.teacherIds).toEqual([teacherId2]);

      // No explicit cleanup needed; root-level beforeEach truncates tables
    });
  });
});
