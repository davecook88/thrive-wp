import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification } from "./entities/notification.entity.js";
import {
  CreateNotificationDto,
  NotificationDto,
  PaginatedNotificationsResponseDto,
  GetNotificationsQueryDto,
} from "@thrive/shared";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationEvent } from "../events/notification.events.js";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
  ) {}

  async getNotificationsForUser(
    userId: number,
    options: GetNotificationsQueryDto = {},
  ): Promise<PaginatedNotificationsResponseDto> {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const whereClause: { userId: number; isRead?: boolean } = { userId };
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const [notifications, total] = await this.notificationsRepo.findAndCount({
      where: whereClause,
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });

    return {
      items: notifications.map(this.toDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationsRepo.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(
    notificationId: number,
    userId: number,
  ): Promise<NotificationDto> {
    const notification = await this.notificationsRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    notification.isRead = true;
    await this.notificationsRepo.save(notification);

    return this.toDto(notification);
  }

  async markAllAsRead(userId: number): Promise<{ updatedCount: number }> {
    const result = await this.notificationsRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updatedCount: result.affected ?? 0 };
  }

  async deleteNotification(
    notificationId: number,
    userId: number,
  ): Promise<void> {
    const notification = await this.notificationsRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    await this.notificationsRepo.delete(notificationId);
  }

  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationDto> {
    const notification = this.notificationsRepo.create(createNotificationDto);
    await this.notificationsRepo.save(notification);
    return this.toDto(notification);
  }

  @OnEvent("notification.created")
  handleNotificationCreatedEvent(payload: NotificationEvent) {
    this.createNotification({
      userId: payload.userId,
      type: payload.type,
      data: payload.data,
    });
  }

  private toDto(notification: Notification): NotificationDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
