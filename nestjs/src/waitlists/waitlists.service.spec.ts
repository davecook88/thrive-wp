import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistsService } from './waitlists.service.js';
import { Waitlist } from './entities/waitlist.entity.js';
import { Session, SessionStatus } from '../sessions/entities/session.entity.js';
import { Booking, BookingStatus } from '../payments/entities/booking.entity.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ServiceType } from '../common/types/class-types.js';

describe('WaitlistsService', () => {
  let service: WaitlistsService;
  let waitlistRepository: Repository<Waitlist>;
  let sessionRepository: Repository<Session>;
  let bookingRepository: Repository<Booking>;

  const mockWaitlistRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSessionRepository = {
    findOne: jest.fn(),
  };

  const mockBookingRepository = {
    count: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistsService,
        {
          provide: getRepositoryToken(Waitlist),
          useValue: mockWaitlistRepository,
        },
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
      ],
    }).compile();

    service = module.get<WaitlistsService>(WaitlistsService);
    waitlistRepository = module.get<Repository<Waitlist>>(
      getRepositoryToken(Waitlist),
    );
    sessionRepository = module.get<Repository<Session>>(
      getRepositoryToken(Session),
    );
    bookingRepository = module.get<Repository<Booking>>(
      getRepositoryToken(Booking),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('joinWaitlist', () => {
    it('should add student to waitlist when session is full', async () => {
      const sessionId = 1;
      const studentId = 1;
      const session = {
        id: sessionId,
        capacityMax: 5,
        type: ServiceType.GROUP,
        status: SessionStatus.SCHEDULED,
      } as Session;

      mockSessionRepository.findOne.mockResolvedValue(session);
      mockBookingRepository.count.mockResolvedValue(5); // Session is full
      mockWaitlistRepository.findOne.mockResolvedValue(null); // No existing entry
      mockWaitlistRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxPosition: 2 }),
      });

      const newWaitlistEntry = {
        id: 1,
        sessionId,
        studentId,
        position: 3,
        notifiedAt: null,
        notificationExpiresAt: null,
      } as Waitlist;

      mockWaitlistRepository.create.mockReturnValue(newWaitlistEntry);
      mockWaitlistRepository.save.mockResolvedValue(newWaitlistEntry);

      const result = await service.joinWaitlist(sessionId, studentId);

      expect(result.position).toBe(3);
      expect(mockWaitlistRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if session does not exist', async () => {
      mockSessionRepository.findOne.mockResolvedValue(null);

      await expect(service.joinWaitlist(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if session is not full', async () => {
      const session = {
        id: 1,
        capacityMax: 5,
        type: ServiceType.GROUP,
      } as Session;

      mockSessionRepository.findOne.mockResolvedValue(session);
      mockBookingRepository.count.mockResolvedValue(3); // Not full

      await expect(service.joinWaitlist(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return existing entry if student already on waitlist', async () => {
      const session = { id: 1, capacityMax: 5 } as Session;
      const existingEntry = {
        id: 1,
        sessionId: 1,
        studentId: 1,
        position: 2,
      } as Waitlist;

      mockSessionRepository.findOne.mockResolvedValue(session);
      mockBookingRepository.count.mockResolvedValue(5);
      mockWaitlistRepository.findOne.mockResolvedValue(existingEntry);

      const result = await service.joinWaitlist(1, 1);

      expect(result).toBe(existingEntry);
      expect(mockWaitlistRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('leaveWaitlist', () => {
    it('should remove student from waitlist and reorder positions', async () => {
      const waitlistEntry = {
        id: 1,
        sessionId: 1,
        studentId: 1,
        position: 2,
      } as Waitlist;

      mockWaitlistRepository.findOne.mockResolvedValue(waitlistEntry);
      mockWaitlistRepository.delete.mockResolvedValue({ affected: 1 });
      mockWaitlistRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      });

      await service.leaveWaitlist(1, 1);

      expect(mockWaitlistRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if entry does not exist', async () => {
      mockWaitlistRepository.findOne.mockResolvedValue(null);

      await expect(service.leaveWaitlist(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('notifyWaitlistMember', () => {
    it('should update notifiedAt and notificationExpiresAt fields', async () => {
      const waitlistEntry = {
        id: 1,
        sessionId: 1,
        studentId: 1,
        position: 1,
        notifiedAt: null,
        notificationExpiresAt: null,
      } as Waitlist;

      mockWaitlistRepository.findOne.mockResolvedValue(waitlistEntry);
      mockWaitlistRepository.save.mockResolvedValue({
        ...waitlistEntry,
        notifiedAt: new Date(),
        notificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await service.notifyWaitlistMember(1, 24);

      expect(mockWaitlistRepository.save).toHaveBeenCalled();
      const savedEntry = mockWaitlistRepository.save.mock.calls[0][0];
      expect(savedEntry.notifiedAt).toBeDefined();
      expect(savedEntry.notificationExpiresAt).toBeDefined();
    });

    it('should throw NotFoundException if entry does not exist', async () => {
      mockWaitlistRepository.findOne.mockResolvedValue(null);

      await expect(service.notifyWaitlistMember(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('handleBookingCancellation', () => {
    it('should notify first waitlist member when booking is cancelled', async () => {
      const waitlist = [
        { id: 1, position: 1, studentId: 1 } as Waitlist,
        { id: 2, position: 2, studentId: 2 } as Waitlist,
      ];

      mockWaitlistRepository.find.mockResolvedValue(waitlist);
      mockWaitlistRepository.findOne.mockResolvedValue(waitlist[0]);
      mockWaitlistRepository.save.mockResolvedValue(waitlist[0]);

      await service.handleBookingCancellation(1);

      expect(mockWaitlistRepository.save).toHaveBeenCalled();
    });

    it('should do nothing if no waitlist exists', async () => {
      mockWaitlistRepository.find.mockResolvedValue([]);

      await service.handleBookingCancellation(1);

      expect(mockWaitlistRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getMyWaitlists', () => {
    it('should return waitlists for a student', async () => {
      const waitlists = [
        {
          id: 1,
          sessionId: 1,
          studentId: 1,
          position: 1,
          session: {
            id: 1,
            startAt: new Date(),
            endAt: new Date(),
          },
        } as Waitlist,
      ];

      mockWaitlistRepository.find.mockResolvedValue(waitlists);

      const result = await service.getMyWaitlists(1);

      expect(result).toEqual(waitlists);
      expect(mockWaitlistRepository.find).toHaveBeenCalledWith({
        where: { studentId: 1 },
        order: { createdAt: 'DESC' },
        relations: ['session', 'session.groupClass', 'session.groupClass.level'],
      });
    });
  });
});
