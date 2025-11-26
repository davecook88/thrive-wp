import { describe, beforeEach, it, expect, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import { Notification } from "./entities/notification.entity.js";
import { NotificationEvent } from "../events/notification.events.js";

// Mock types
type MockNotification = {
  id: number;
  userId: number;
  type: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
};

describe("NotificationsService", () => {
  let service: NotificationsService;

  const mockNotificationsRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    findAndCount: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationsRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getNotificationsForUser", () => {
    it("should return paginated notifications for a user ordered by createdAt DESC", async () => {
      const mockNotifications: MockNotification[] = [
        {
          id: 2,
          userId: 1,
          type: "booking_created",
          data: { bookingId: 2 },
          isRead: false,
          createdAt: new Date("2025-01-02"),
        },
        {
          id: 1,
          userId: 1,
          type: "booking_created",
          data: { bookingId: 1 },
          isRead: true,
          createdAt: new Date("2025-01-01"),
        },
      ];

      mockNotificationsRepository.findAndCount.mockResolvedValue([
        mockNotifications,
        2,
      ]);

      const result = await service.getNotificationsForUser(1);

      expect(mockNotificationsRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 1 },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].id).toBe(2);
      expect(result.items[0].type).toBe("booking_created");
      expect(result.items[0].isRead).toBe(false);
    });

    it("should support pagination options", async () => {
      const mockNotifications: MockNotification[] = [
        {
          id: 3,
          userId: 1,
          type: "test",
          data: null,
          isRead: false,
          createdAt: new Date("2025-01-03"),
        },
      ];

      mockNotificationsRepository.findAndCount.mockResolvedValue([
        mockNotifications,
        25,
      ]);

      const result = await service.getNotificationsForUser(1, {
        page: 2,
        limit: 10,
      });

      expect(mockNotificationsRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 1 },
        order: { createdAt: "DESC" },
        skip: 10,
        take: 10,
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
    });

    it("should filter by unread only when requested", async () => {
      mockNotificationsRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getNotificationsForUser(1, { unreadOnly: true });

      expect(mockNotificationsRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 1, isRead: false },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should return empty items when user has no notifications", async () => {
      mockNotificationsRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getNotificationsForUser(999);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it("should convert entity to DTO with ISO date string", async () => {
      const createdDate = new Date("2025-01-15T10:30:00Z");
      const mockNotifications: MockNotification[] = [
        {
          id: 1,
          userId: 1,
          type: "test_type",
          data: null,
          isRead: false,
          createdAt: createdDate,
        },
      ];

      mockNotificationsRepository.findAndCount.mockResolvedValue([
        mockNotifications,
        1,
      ]);

      const result = await service.getNotificationsForUser(1);

      expect(result.items[0].createdAt).toBe(createdDate.toISOString());
    });
  });

  describe("getUnreadCount", () => {
    it("should return the count of unread notifications", async () => {
      mockNotificationsRepository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(1);

      expect(mockNotificationsRepository.count).toHaveBeenCalledWith({
        where: { userId: 1, isRead: false },
      });
      expect(result).toBe(5);
    });

    it("should return 0 when no unread notifications", async () => {
      mockNotificationsRepository.count.mockResolvedValue(0);

      const result = await service.getUnreadCount(1);

      expect(result).toBe(0);
    });
  });

  describe("markAsRead", () => {
    it("should mark notification as read and return updated DTO", async () => {
      const mockNotification: MockNotification = {
        id: 1,
        userId: 1,
        type: "booking_created",
        data: { bookingId: 1 },
        isRead: false,
        createdAt: new Date("2025-01-01"),
      };

      mockNotificationsRepository.findOne.mockResolvedValue(mockNotification);
      mockNotificationsRepository.save.mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markAsRead(1, 1);

      expect(mockNotificationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
      expect(mockNotificationsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isRead: true }),
      );
      expect(result.isRead).toBe(true);
    });

    it("should throw NotFoundException when notification does not exist", async () => {
      mockNotificationsRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead(999, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.markAsRead(999, 1)).rejects.toThrow(
        "Notification not found",
      );
    });

    it("should not allow marking another user's notification as read", async () => {
      mockNotificationsRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read", async () => {
      mockNotificationsRepository.update.mockResolvedValue({ affected: 5 });

      const result = await service.markAllAsRead(1);

      expect(mockNotificationsRepository.update).toHaveBeenCalledWith(
        { userId: 1, isRead: false },
        { isRead: true },
      );
      expect(result.updatedCount).toBe(5);
    });

    it("should return 0 when no unread notifications to update", async () => {
      mockNotificationsRepository.update.mockResolvedValue({ affected: 0 });

      const result = await service.markAllAsRead(1);

      expect(result.updatedCount).toBe(0);
    });
  });

  describe("deleteNotification", () => {
    it("should delete a notification", async () => {
      const mockNotification: MockNotification = {
        id: 1,
        userId: 1,
        type: "booking_created",
        data: null,
        isRead: false,
        createdAt: new Date(),
      };

      mockNotificationsRepository.findOne.mockResolvedValue(mockNotification);
      mockNotificationsRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteNotification(1, 1);

      expect(mockNotificationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
      expect(mockNotificationsRepository.delete).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException when notification does not exist", async () => {
      mockNotificationsRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteNotification(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should not allow deleting another user's notification", async () => {
      mockNotificationsRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteNotification(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createNotification", () => {
    it("should create a new notification and return DTO", async () => {
      const createDto = {
        userId: 1,
        type: "booking_created",
        data: { bookingId: 123 },
      };

      const mockCreated: MockNotification = {
        id: 1,
        userId: 1,
        type: "booking_created",
        data: { bookingId: 123 },
        isRead: false,
        createdAt: new Date("2025-01-15"),
      };

      mockNotificationsRepository.create.mockReturnValue(mockCreated);
      mockNotificationsRepository.save.mockResolvedValue(mockCreated);

      const result = await service.createNotification(createDto);

      expect(mockNotificationsRepository.create).toHaveBeenCalledWith(
        createDto,
      );
      expect(mockNotificationsRepository.save).toHaveBeenCalledWith(
        mockCreated,
      );
      expect(result.id).toBe(1);
      expect(result.type).toBe("booking_created");
      expect(result.data).toEqual({ bookingId: 123 });
      expect(result.isRead).toBe(false);
    });

    it("should handle notification with null data", async () => {
      const createDto = {
        userId: 1,
        type: "system_message",
      };

      const mockCreated: MockNotification = {
        id: 1,
        userId: 1,
        type: "system_message",
        data: null,
        isRead: false,
        createdAt: new Date("2025-01-15"),
      };

      mockNotificationsRepository.create.mockReturnValue(mockCreated);
      mockNotificationsRepository.save.mockResolvedValue(mockCreated);

      const result = await service.createNotification(createDto);

      expect(result.data).toBeNull();
    });
  });

  describe("handleNotificationCreatedEvent", () => {
    it("should create notification from event payload", async () => {
      const event = new NotificationEvent(1, "booking_created", {
        bookingId: 123,
      });

      const mockCreated: MockNotification = {
        id: 1,
        userId: 1,
        type: "booking_created",
        data: { bookingId: 123 },
        isRead: false,
        createdAt: new Date(),
      };

      mockNotificationsRepository.create.mockReturnValue(mockCreated);
      mockNotificationsRepository.save.mockResolvedValue(mockCreated);

      // Call the event handler directly
      service.handleNotificationCreatedEvent(event);

      // Wait for async operation
      await vi.waitFor(() => {
        expect(mockNotificationsRepository.create).toHaveBeenCalledWith({
          userId: 1,
          type: "booking_created",
          data: { bookingId: 123 },
        });
      });
    });

    it("should handle event without data", async () => {
      const event = new NotificationEvent(1, "welcome");

      const mockCreated: MockNotification = {
        id: 1,
        userId: 1,
        type: "welcome",
        data: null,
        isRead: false,
        createdAt: new Date(),
      };

      mockNotificationsRepository.create.mockReturnValue(mockCreated);
      mockNotificationsRepository.save.mockResolvedValue(mockCreated);

      service.handleNotificationCreatedEvent(event);

      await vi.waitFor(() => {
        expect(mockNotificationsRepository.create).toHaveBeenCalledWith({
          userId: 1,
          type: "welcome",
          data: undefined,
        });
      });
    });
  });
});
