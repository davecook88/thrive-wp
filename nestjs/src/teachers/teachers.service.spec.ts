import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TeachersService } from './teachers.service.js';
import { Teacher } from './entities/teacher.entity.js';
import {
  TeacherAvailability,
  TeacherAvailabilityKind,
} from './entities/teacher-availability.entity.js';
import {
  UpdateAvailabilityDto,
  PreviewAvailabilityDto,
} from './dto/availability.dto.js';
import { Session } from '../sessions/entities/session.entity.js';

// Mock types
type MockTeacher = {
  id: number;
  userId: number;
  tier: number;
  bio: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  availability?: any[];
};

type UpdateFunc = () => Promise<{ affected: number }>;
type SaveFunc = () => Promise<{ id: number }>;

describe('TeachersService', () => {
  let service: TeachersService;
  let teacherRepo: Repository<Teacher>;
  let availabilityRepo: Repository<TeacherAvailability>;
  let sessionRepo: Repository<Session>;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachersService,
        {
          provide: getRepositoryToken(Teacher),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(TeacherAvailability),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Session),
          useClass: Repository,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TeachersService>(TeachersService);
    teacherRepo = module.get<Repository<Teacher>>(getRepositoryToken(Teacher));
    availabilityRepo = module.get<Repository<TeacherAvailability>>(
      getRepositoryToken(TeacherAvailability),
    );
    sessionRepo = module.get<Repository<Session>>(getRepositoryToken(Session));
    dataSource = module.get<DataSource>(DataSource);

    // Mock dataSource.query to return empty results for scheduled sessions
    jest.spyOn(dataSource, 'query').mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateTeacherAvailability', () => {
    it('should handle rules that span midnight', async () => {
      const teacherId = 1;
      const dto: UpdateAvailabilityDto = {
        rules: [
          {
            weekday: 3, // Wednesday
            startTime: '18:00',
            endTime: '04:00', // Spans to next day
          },
        ],
        exceptions: [],
      };

      const mockTeacher: MockTeacher = {
        id: 1,
        userId: teacherId,
        tier: 1,
        bio: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock repository methods
      jest.spyOn(teacherRepo, 'findOne').mockResolvedValue(mockTeacher as any);
      jest.spyOn(availabilityRepo, 'find').mockResolvedValue([]);
      jest
        .spyOn(availabilityRepo, 'update')
        .mockResolvedValue({ affected: 1 } as any);

      const mockManager = {
        update: jest.fn<UpdateFunc>().mockResolvedValue({ affected: 1 }),
        save: jest.fn<SaveFunc>().mockResolvedValue({ id: 1 }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (callback: any) => {
          return callback(mockManager);
        },
      );

      // Mock getTeacherAvailability
      jest.spyOn(service as any, 'getTeacherAvailability').mockResolvedValue({
        rules: [
          {
            id: 1,
            weekday: 3,
            startTime: '18:00',
            endTime: '04:00',
          },
        ],
        exceptions: [],
      });

      const result = await service.updateTeacherAvailability(teacherId, dto);

      expect(result).toEqual({
        rules: [
          {
            id: 1,
            weekday: 3,
            startTime: '18:00',
            endTime: '04:00',
          },
        ],
        exceptions: [],
      });

      // Verify that save was called with endTimeMinutes = 1680 (240 + 1440)
      expect(mockManager.save).toHaveBeenCalledWith(TeacherAvailability, {
        teacherId: 1,
        kind: TeacherAvailabilityKind.RECURRING,
        weekday: 3,
        startTimeMinutes: 18 * 60, // 1080
        endTimeMinutes: 4 * 60 + 24 * 60, // 240 + 1440 = 1680
        isActive: true,
      });
    });

    it('should handle normal rules without spanning', async () => {
      const teacherId = 1;
      const dto: UpdateAvailabilityDto = {
        rules: [
          {
            weekday: 1,
            startTime: '09:00',
            endTime: '17:00',
          },
        ],
        exceptions: [],
      };

      const mockTeacher: MockTeacher = {
        id: 1,
        userId: teacherId,
        tier: 1,
        bio: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(teacherRepo, 'findOne').mockResolvedValue(mockTeacher as any);
      jest.spyOn(availabilityRepo, 'find').mockResolvedValue([]);
      jest
        .spyOn(availabilityRepo, 'update')
        .mockResolvedValue({ affected: 1 } as any);

      const mockManager = {
        update: jest.fn<UpdateFunc>().mockResolvedValue({ affected: 1 }),
        save: jest.fn<SaveFunc>().mockResolvedValue({ id: 1 }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (callback: any) => {
          return callback(mockManager);
        },
      );

      jest.spyOn(service as any, 'getTeacherAvailability').mockResolvedValue({
        rules: [
          {
            id: 1,
            weekday: 1,
            startTime: '09:00',
            endTime: '17:00',
          },
        ],
        exceptions: [],
      });

      const result = await service.updateTeacherAvailability(teacherId, dto);

      expect(result).toEqual({
        rules: [
          {
            id: 1,
            weekday: 1,
            startTime: '09:00',
            endTime: '17:00',
          },
        ],
        exceptions: [],
      });

      // Verify that save was called with correct minutes without adding 1440
      expect(mockManager.save).toHaveBeenCalledWith(TeacherAvailability, {
        teacherId: 1,
        kind: TeacherAvailabilityKind.RECURRING,
        weekday: 1,
        startTimeMinutes: 9 * 60, // 540
        endTimeMinutes: 17 * 60, // 1020
        isActive: true,
      });
    });

    it('should handle exceptions that span midnight', async () => {
      const teacherId = 1;
      const dto: UpdateAvailabilityDto = {
        rules: [],
        exceptions: [
          {
            date: '2025-09-03',
            startTime: '22:00',
            endTime: '02:00', // Spans to next day
            isBlackout: true,
          },
        ],
      };

      const mockTeacher: MockTeacher = {
        id: 1,
        userId: teacherId,
        tier: 1,
        bio: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(teacherRepo, 'findOne').mockResolvedValue(mockTeacher as any);
      jest.spyOn(availabilityRepo, 'find').mockResolvedValue([]);
      jest
        .spyOn(availabilityRepo, 'update')
        .mockResolvedValue({ affected: 1 } as any);

      const mockManager = {
        update: jest.fn<UpdateFunc>().mockResolvedValue({ affected: 1 }),
        save: jest.fn<SaveFunc>().mockResolvedValue({ id: 1 }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (callback: any) => {
          return callback(mockManager);
        },
      );

      jest.spyOn(service as any, 'getTeacherAvailability').mockResolvedValue({
        rules: [],
        exceptions: [
          {
            id: 1,
            date: '2025-09-03',
            startTime: '22:00',
            endTime: '02:00',
            isBlackout: true,
          },
        ],
      });

      const result = await service.updateTeacherAvailability(teacherId, dto);

      expect(result).toEqual({
        rules: [],
        exceptions: [
          {
            id: 1,
            date: '2025-09-03',
            startTime: '22:00',
            endTime: '02:00',
            isBlackout: true,
          },
        ],
      });

      // Verify that endAt is set to next day
      const expectedStartAt = new Date('2025-09-03T22:00:00.000Z');
      const expectedEndAt = new Date('2025-09-04T02:00:00.000Z'); // Next day

      expect(mockManager.save).toHaveBeenCalledWith(TeacherAvailability, {
        teacherId: 1,
        kind: TeacherAvailabilityKind.BLACKOUT,
        startAt: expectedStartAt,
        endAt: expectedEndAt,
        isActive: true,
      });
    });

    it('should throw NotFoundException if teacher not found', async () => {
      const teacherId = 999;
      const dto: UpdateAvailabilityDto = {
        rules: [],
        exceptions: [],
      };

      jest.spyOn(teacherRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.updateTeacherAvailability(teacherId, dto),
      ).rejects.toThrow('Teacher not found');
    });
  });

  describe('getTeacherAvailability', () => {
    it('should return wrapped endTime for spanning rules', async () => {
      const teacherId = 1;
      const mockTeacher = {
        id: 1,
        userId: teacherId,
        tier: 1,
        bio: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAvailability = {
        id: 1,
        teacherId: 1,
        kind: TeacherAvailabilityKind.RECURRING,
        weekday: 3,
        startTimeMinutes: 18 * 60, // 1080
        endTimeMinutes: 4 * 60 + 24 * 60, // 1680
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(teacherRepo, 'findOne').mockResolvedValue(mockTeacher as any);
      jest
        .spyOn(availabilityRepo, 'find')
        .mockResolvedValue([mockAvailability as any]);

      const result = await service.getTeacherAvailability(teacherId);

      expect(result).toEqual({
        rules: [
          {
            id: 1,
            weekday: 3,
            startTime: '18:00',
            endTime: '04:00', // Wrapped back from 1680 % 1440 = 240 -> 04:00
          },
        ],
        exceptions: [],
      });
    });
  });

  describe('previewTeacherAvailability', () => {});

  describe('previewTeacherAvailability', () => {
    it('should generate correct preview windows for spanning rules', async () => {
      const teacherId = 1;
      const dto: PreviewAvailabilityDto = {
        start: '2025-09-03T00:00:00.000Z', // Wednesday
        end: '2025-09-03T23:59:59.999Z',
        teacherIds: [teacherId],
      };

      const mockTeacher = {
        id: 1,
        userId: teacherId,
        tier: 1,
        bio: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock availability with spanning rule (Wednesday: 18:00 to 04:00 next day)
      const mockAvailability = {
        id: 1,
        teacherId: 1,
        kind: TeacherAvailabilityKind.RECURRING,
        weekday: 3, // Wednesday
        startTimeMinutes: 18 * 60, // 1080
        endTimeMinutes: 4 * 60 + 24 * 60, // 1680 (spanning to next day)
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(teacherRepo, 'findOne').mockResolvedValue(mockTeacher as any);
      jest
        .spyOn(availabilityRepo, 'find')
        .mockResolvedValue([mockAvailability as any]);
      jest.spyOn(sessionRepo, 'find').mockResolvedValue([]);

      const result = await service.previewTeacherAvailability([teacherId], dto);

      expect(result.windows).toHaveLength(1);

      const window = result.windows[0];
      // Should start at 18:00 on 2025-09-03
      expect(window.start).toBe('2025-09-03T18:00:00.000Z');
      // Should end at 04:00 on 2025-09-04 (next day)
      expect(window.end).toBe('2025-09-04T04:00:00.000Z');
    });

    it('should generate correct preview windows for normal rules', async () => {
      const teacherId = 1;
      const dto: PreviewAvailabilityDto = {
        start: '2025-09-01T00:00:00.000Z', // Monday
        end: '2025-09-01T23:59:59.999Z',
        teacherIds: [teacherId],
      };

      const mockTeacher = {
        id: 1,
        userId: teacherId,
        tier: 1,
        bio: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock availability with normal rule (Monday: 09:00 to 17:00)
      const mockAvailability = {
        id: 1,
        teacherId: 1,
        kind: TeacherAvailabilityKind.RECURRING,
        weekday: 1, // Monday
        startTimeMinutes: 9 * 60, // 540
        endTimeMinutes: 17 * 60, // 1020
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(teacherRepo, 'findOne').mockResolvedValue(mockTeacher as any);
      jest
        .spyOn(availabilityRepo, 'find')
        .mockResolvedValue([mockAvailability as any]);
      jest.spyOn(sessionRepo, 'find').mockResolvedValue([]);

      const result = await service.previewTeacherAvailability([teacherId], dto);

      expect(result.windows).toHaveLength(1);

      const window = result.windows[0];
      expect(window.start).toBe('2025-09-01T09:00:00.000Z');
      expect(window.end).toBe('2025-09-01T17:00:00.000Z');
    });

    it('should handle multiple days with spanning rules', async () => {
      const teacherId = 1;
      const dto: PreviewAvailabilityDto = {
        start: '2025-09-03T00:00:00.000Z', // Wednesday
        end: '2025-09-04T23:59:59.999Z', // Thursday
        teacherIds: [teacherId],
      };

      const mockTeacher = {
        id: 1,
        userId: teacherId,
        tier: 1,
        bio: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock availability with spanning rule (Wednesday: 18:00 to 04:00 next day)
      const mockAvailability = {
        id: 1,
        teacherId: 1,
        kind: TeacherAvailabilityKind.RECURRING,
        weekday: 3, // Wednesday
        startTimeMinutes: 18 * 60, // 1080
        endTimeMinutes: 4 * 60 + 24 * 60, // 1680
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(teacherRepo, 'findOne').mockResolvedValue(mockTeacher as any);
      jest
        .spyOn(availabilityRepo, 'find')
        .mockResolvedValue([mockAvailability as any]);
      jest.spyOn(sessionRepo, 'find').mockResolvedValue([]);

      const result = await service.previewTeacherAvailability([teacherId], dto);

      expect(result.windows).toHaveLength(1);

      const window = result.windows[0];
      expect(window.start).toBe('2025-09-03T18:00:00.000Z');
      expect(window.end).toBe('2025-09-04T04:00:00.000Z');
    });

    it('should throw NotFoundException if teacher not found', async () => {
      const teacherId = 999;
      const dto: PreviewAvailabilityDto = {
        start: '2025-09-03T00:00:00.000Z',
        end: '2025-09-03T23:59:59.999Z',
        teacherIds: [teacherId],
      };

      jest.spyOn(teacherRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(availabilityRepo, 'find').mockResolvedValue([]);

      await expect(
        service.previewTeacherAvailability([teacherId], dto),
      ).rejects.toThrow('Teacher not found');
    });

    it('should throw BadRequestException for range exceeding 90 days', async () => {
      const teacherId = 1;
      const dto: PreviewAvailabilityDto = {
        start: '2025-09-03T00:00:00.000Z',
        end: '2026-12-03T23:59:59.999Z', // More than 90 days
        teacherIds: [teacherId],
      };

      const mockTeacher = {
        id: 1,
        userId: teacherId,
        tier: 1,
        bio: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(teacherRepo, 'findOne').mockResolvedValue(mockTeacher as any);
      jest.spyOn(availabilityRepo, 'find').mockResolvedValue([]);

      await expect(
        service.previewTeacherAvailability([teacherId], dto),
      ).rejects.toThrow('Preview range cannot exceed 90 days');
    });
  });
});
