import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service.js';
import { TeacherAvailabilityService } from '../../teachers/services/teacher-availability.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SessionsService', () => {
  let service: SessionsService;
  let teacherAvailabilityService: jest.Mocked<TeacherAvailabilityService>;

  beforeEach(async () => {
    const mockTeacherAvailabilityService = {
      validateAvailability: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: TeacherAvailabilityService,
          useValue: mockTeacherAvailabilityService,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    teacherAvailabilityService = module.get(TeacherAvailabilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAvailability', () => {
    const mockParams = {
      teacherId: 1,
      startAt: '2025-09-10T10:00:00Z',
      endAt: '2025-09-10T11:00:00Z',
    };

    it('should return valid result when session is valid', async () => {
      const mockResult = { valid: true, teacherId: 1 };
      teacherAvailabilityService.validateAvailability.mockResolvedValue(
        mockResult,
      );

      const result = await service.validatePrivateSession(mockParams);

      expect(result).toEqual(mockResult);
      expect(
        teacherAvailabilityService.validateAvailability,
      ).toHaveBeenCalledWith(mockParams);
    });

    it('should throw NotFoundException when teacher is not found', async () => {
      teacherAvailabilityService.validateAvailability.mockRejectedValue(
        new NotFoundException('Teacher 1 not found.'),
      );

      await expect(service.validatePrivateSession(mockParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(
        teacherAvailabilityService.validateAvailability,
      ).toHaveBeenCalledWith(mockParams);
    });

    it('should throw BadRequestException when teacher is inactive', async () => {
      teacherAvailabilityService.validateAvailability.mockRejectedValue(
        new BadRequestException('Teacher 1 is inactive.'),
      );

      await expect(service.validatePrivateSession(mockParams)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        teacherAvailabilityService.validateAvailability,
      ).toHaveBeenCalledWith(mockParams);
    });

    it('should throw BadRequestException when teacher has no availability', async () => {
      teacherAvailabilityService.validateAvailability.mockRejectedValue(
        new BadRequestException(
          'Teacher 1 is not available during the requested time.',
        ),
      );

      await expect(service.validatePrivateSession(mockParams)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        teacherAvailabilityService.validateAvailability,
      ).toHaveBeenCalledWith(mockParams);
    });

    it('should throw BadRequestException when teacher has a blackout', async () => {
      teacherAvailabilityService.validateAvailability.mockRejectedValue(
        new BadRequestException(
          'Teacher 1 has a blackout during the requested time.',
        ),
      );

      await expect(service.validatePrivateSession(mockParams)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        teacherAvailabilityService.validateAvailability,
      ).toHaveBeenCalledWith(mockParams);
    });

    it('should throw BadRequestException when there is a conflicting booking', async () => {
      teacherAvailabilityService.validateAvailability.mockRejectedValue(
        new BadRequestException(
          'Teacher 1 has a conflicting booking during the requested time.',
        ),
      );

      await expect(service.validatePrivateSession(mockParams)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        teacherAvailabilityService.validateAvailability,
      ).toHaveBeenCalledWith(mockParams);
    });

    it('should throw BadRequestException on database error', async () => {
      teacherAvailabilityService.validateAvailability.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.validatePrivateSession(mockParams)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        teacherAvailabilityService.validateAvailability,
      ).toHaveBeenCalledWith(mockParams);
    });
  });
});
