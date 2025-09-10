import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestDatabaseModule } from '../src/test-database.module.js';
import { TeacherAvailabilityService } from '../src/teachers/services/teacher-availability.service.js';
import { TeacherAvailabilityKind } from '../src/teachers/entities/teacher-availability.entity.js';
import { ServiceType } from '../src/common/types/class-types.js';

describe('TeacherAvailabilityService (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let service: TeacherAvailabilityService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestDatabaseModule],
      providers: [TeacherAvailabilityService],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get(DataSource);
    service = moduleFixture.get(TeacherAvailabilityService);
    await app.init();
  }, 30000);

  afterEach(async () => {
    await app.close();
  });

  describe('validateAvailability', () => {
    let teacherId: number;
    let userId: number;

    beforeEach(async () => {
      // Create a test user
      const userResult = await dataSource.query(
        'INSERT INTO user (email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        ['test@example.com', 'Test', 'User'],
      );
      userId = userResult.insertId;

      // Create a test teacher
      const teacherResult = await dataSource.query(
        'INSERT INTO teacher (user_id, tier, bio, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [userId, 10, 'Test bio', true],
      );
      teacherId = teacherResult.insertId;
    });

    afterEach(async () => {
      // Clean up test data
      await dataSource.query('DELETE FROM session WHERE teacher_id = ?', [
        teacherId,
      ]);
      await dataSource.query(
        'DELETE FROM teacher_availability WHERE teacher_id = ?',
        [teacherId],
      );
      await dataSource.query('DELETE FROM teacher WHERE id = ?', [teacherId]);
      await dataSource.query('DELETE FROM user WHERE id = ?', [userId]);
    });

    it('should validate successfully when teacher has ONE_OFF availability', async () => {
      // Create ONE_OFF availability for the teacher
      await dataSource.query(
        'INSERT INTO teacher_availability (teacher_id, kind, start_at, end_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [
          teacherId,
          TeacherAvailabilityKind.ONE_OFF,
          '2024-01-15 10:00:00',
          '2024-01-15 11:00:00',
          true,
        ],
      );

      const result = await service.validateAvailability({
        teacherId,
        startAt: '2024-01-15T10:30:00.000Z',
        endAt: '2024-01-15T11:00:00.000Z',
      });

      expect(result).toEqual({
        valid: true,
        teacherId,
      });
    });

    it('should validate successfully when teacher has RECURRING availability', async () => {
      // Create RECURRING availability for Monday (weekday 1) from 10:00 to 11:00
      await dataSource.query(
        'INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [teacherId, TeacherAvailabilityKind.RECURRING, 1, 600, 660, true], // Monday 10:00-11:00
      );

      const result = await service.validateAvailability({
        teacherId,
        startAt: '2024-01-15T10:30:00.000Z', // Monday Jan 15, 2024
        endAt: '2024-01-15T11:00:00.000Z',
      });

      expect(result).toEqual({
        valid: true,
        teacherId,
      });
    });

    it('should fail when teacher has a blackout during requested time', async () => {
      // Create availability
      await dataSource.query(
        'INSERT INTO teacher_availability (teacher_id, kind, start_at, end_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [
          teacherId,
          TeacherAvailabilityKind.ONE_OFF,
          '2024-01-15 10:00:00',
          '2024-01-15 11:00:00',
          true,
        ],
      );

      // Create blackout
      await dataSource.query(
        'INSERT INTO teacher_availability (teacher_id, kind, start_at, end_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [
          teacherId,
          TeacherAvailabilityKind.BLACKOUT,
          '2024-01-15 10:30:00',
          '2024-01-15 10:45:00',
          true,
        ],
      );

      await expect(
        service.validateAvailability({
          teacherId,
          startAt: '2024-01-15T10:30:00.000Z',
          endAt: '2024-01-15T10:45:00.000Z',
        }),
      ).rejects.toThrow('Teacher 1 has a blackout during the requested time.');
    });

    it('should fail when teacher has a conflicting booking', async () => {
      // Create availability
      await dataSource.query(
        'INSERT INTO teacher_availability (teacher_id, kind, start_at, end_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [
          teacherId,
          TeacherAvailabilityKind.ONE_OFF,
          '2024-01-15 10:00:00',
          '2024-01-15 11:00:00',
          true,
        ],
      );

      // Create conflicting session
      await dataSource.query(
        'INSERT INTO session (type, teacher_id, start_at, end_at, capacity_max, status, visibility, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [
          ServiceType.PRIVATE,
          teacherId,
          '2024-01-15 10:15:00',
          '2024-01-15 10:45:00',
          1,
          'SCHEDULED',
          'PRIVATE',
        ],
      );

      await expect(
        service.validateAvailability({
          teacherId,
          startAt: '2024-01-15T10:30:00.000Z',
          endAt: '2024-01-15T11:00:00.000Z',
        }),
      ).rejects.toThrow(
        'Teacher 1 has a conflicting booking during the requested time.',
      );
    });

    it('should fail when teacher is inactive', async () => {
      // Update teacher to be inactive
      await dataSource.query('UPDATE teacher SET is_active = 0 WHERE id = ?', [
        teacherId,
      ]);

      await expect(
        service.validateAvailability({
          teacherId,
          startAt: '2024-01-15T10:30:00.000Z',
          endAt: '2024-01-15T11:00:00.000Z',
        }),
      ).rejects.toThrow('Teacher 1 is inactive.');
    });

    it('should fail when teacher does not exist', async () => {
      const nonExistentTeacherId = 99999;

      await expect(
        service.validateAvailability({
          teacherId: nonExistentTeacherId,
          startAt: '2024-01-15T10:30:00.000Z',
          endAt: '2024-01-15T11:00:00.000Z',
        }),
      ).rejects.toThrow('Teacher 99999 not found.');
    });

    it('should fail when teacher has no availability', async () => {
      await expect(
        service.validateAvailability({
          teacherId,
          startAt: '2024-01-15T10:30:00.000Z',
          endAt: '2024-01-15T11:00:00.000Z',
        }),
      ).rejects.toThrow(
        'Teacher 1 is not available during the requested time.',
      );
    });

    it('should fail when RECURRING availability weekday does not match', async () => {
      // Create RECURRING availability for Monday (weekday 1)
      await dataSource.query(
        'INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [teacherId, TeacherAvailabilityKind.RECURRING, 1, 600, 660, true], // Monday 10:00-11:00
      );

      // Try to book on Tuesday (weekday 2)
      await expect(
        service.validateAvailability({
          teacherId,
          startAt: '2024-01-16T10:30:00.000Z', // Tuesday Jan 16, 2024
          endAt: '2024-01-16T11:00:00.000Z',
        }),
      ).rejects.toThrow(
        'Teacher 1 is not available during the requested time.',
      );
    });

    it('should fail when RECURRING availability time does not match', async () => {
      // Create RECURRING availability for Monday 10:00-11:00
      await dataSource.query(
        'INSERT INTO teacher_availability (teacher_id, kind, weekday, start_time_minutes, end_time_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [teacherId, TeacherAvailabilityKind.RECURRING, 1, 600, 660, true], // Monday 10:00-11:00
      );

      // Try to book at 9:00-9:30 (before availability)
      await expect(
        service.validateAvailability({
          teacherId,
          startAt: '2024-01-15T09:00:00.000Z', // Monday Jan 15, 2024
          endAt: '2024-01-15T09:30:00.000Z',
        }),
      ).rejects.toThrow(
        'Teacher 1 is not available during the requested time.',
      );
    });
  });
});
