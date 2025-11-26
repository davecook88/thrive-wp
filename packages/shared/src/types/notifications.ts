import { z } from "zod";

export const NotificationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  type: z.string(),
  data: z.record(z.string(), z.any()).nullable(),
  isRead: z.boolean(),
  createdAt: z.string(),
});

export type NotificationDto = z.infer<typeof NotificationSchema>;

export const CreateNotificationSchema = z.object({
  userId: z.number(),
  type: z.string(),
  data: z.record(z.string(), z.any()).optional(),
});

export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;

export const UpdateNotificationSchema = z.object({
  isRead: z.boolean(),
});

export type UpdateNotificationDto = z.infer<typeof UpdateNotificationSchema>;

// Query params for GET /notifications
export const GetNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  unreadOnly: z
    .union([z.boolean(), z.string().transform((v) => v === "true")])
    .optional(),
});

export type GetNotificationsQueryDto = z.infer<
  typeof GetNotificationsQuerySchema
>;

// Paginated response for notifications
export const PaginatedNotificationsResponseSchema = z.object({
  items: z.array(NotificationSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export type PaginatedNotificationsResponseDto = z.infer<
  typeof PaginatedNotificationsResponseSchema
>;

// Unread count response
export const UnreadCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

export type UnreadCountResponseDto = z.infer<typeof UnreadCountResponseSchema>;

// Mark all as read response
export const MarkAllAsReadResponseSchema = z.object({
  updatedCount: z.number().int().nonnegative(),
});

export type MarkAllAsReadResponseDto = z.infer<
  typeof MarkAllAsReadResponseSchema
>;
