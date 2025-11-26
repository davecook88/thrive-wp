import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import {
  AuthenticatedGuard,
  RequestWithUser,
} from "../auth/authenticated.guard.js";
import { User } from "../auth/user.decorator.js";
import {
  NotificationDto,
  PaginatedNotificationsResponseDto,
  UnreadCountResponseDto,
  MarkAllAsReadResponseDto,
  GetNotificationsQueryDto,
} from "@thrive/shared";

@Controller("notifications")
@UseGuards(AuthenticatedGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get paginated notifications for the authenticated user
   */
  @Get()
  async getNotifications(
    @User() user: RequestWithUser["user"],
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("unreadOnly") unreadOnly?: string,
  ): Promise<PaginatedNotificationsResponseDto> {
    if (!user) {
      throw new UnauthorizedException("User not found in request");
    }

    const queryOptions: GetNotificationsQueryDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
      unreadOnly: unreadOnly === "true",
    };

    return this.notificationsService.getNotificationsForUser(
      user.id,
      queryOptions,
    );
  }

  /**
   * Get unread notification count for the authenticated user
   */
  @Get("unread-count")
  async getUnreadCount(
    @User() user: RequestWithUser["user"],
  ): Promise<UnreadCountResponseDto> {
    if (!user) {
      throw new UnauthorizedException("User not found in request");
    }
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  /**
   * Mark a specific notification as read
   */
  @Patch(":id/read")
  async markAsRead(
    @Param("id", ParseIntPipe) id: number,
    @User() user: RequestWithUser["user"],
  ): Promise<NotificationDto> {
    if (!user) {
      throw new UnauthorizedException("User not found in request");
    }
    return this.notificationsService.markAsRead(id, user.id);
  }

  /**
   * Mark all notifications as read for the authenticated user
   */
  @Patch("read-all")
  async markAllAsRead(
    @User() user: RequestWithUser["user"],
  ): Promise<MarkAllAsReadResponseDto> {
    if (!user) {
      throw new UnauthorizedException("User not found in request");
    }
    return this.notificationsService.markAllAsRead(user.id);
  }

  /**
   * Delete a specific notification
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param("id", ParseIntPipe) id: number,
    @User() user: RequestWithUser["user"],
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException("User not found in request");
    }
    await this.notificationsService.deleteNotification(id, user.id);
  }
}
