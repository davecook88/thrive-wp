import { z } from "zod";

// Join Waitlist DTO
export const JoinWaitlistSchema = z.object({
  sessionId: z.number().int().positive(),
});

export type JoinWaitlistDto = z.infer<typeof JoinWaitlistSchema>;

// Notify Waitlist DTO
export const NotifyWaitlistSchema = z.object({
  expiresInHours: z.number().int().positive().optional().default(24),
});

export type NotifyWaitlistDto = z.infer<typeof NotifyWaitlistSchema>;

// Promote Waitlist DTO
export const PromoteWaitlistSchema = z.object({
  studentPackageId: z.number().int().positive().optional(),
});

export type PromoteWaitlistDto = z.infer<typeof PromoteWaitlistSchema>;

// Response DTOs
export const WaitlistResponseSchema = z.object({
  id: z.number().int().positive(),
  sessionId: z.number().int().positive(),
  position: z.number().int().positive(),
  notifiedAt: z.string().nullable(),
  notificationExpiresAt: z.string().nullable(),
  createdAt: z.string(),
});

export type WaitlistResponseDto = z.infer<typeof WaitlistResponseSchema>;

export const WaitlistWithSessionSchema = WaitlistResponseSchema.extend({
  session: z.object({
    id: z.number().int().positive(),
    startAt: z.string(),
    endAt: z.string(),
    type: z.string(),
    groupClass: z
      .object({
        id: z.number().int().positive(),
        title: z.string(),
        levels: z.array(
          z.object({
            code: z.string(),
            name: z.string(),
          }),
        ),
      })
      .optional(),
  }),
});

export type WaitlistWithSessionDto = z.infer<typeof WaitlistWithSessionSchema>;

export const WaitlistWithStudentSchema = WaitlistResponseSchema.extend({
  student: z.object({
    id: z.number().int().positive(),
    userId: z.number().int().positive(),
    name: z.string(),
    email: z.string(),
  }),
});

export type WaitlistWithStudentDto = z.infer<typeof WaitlistWithStudentSchema>;

// Legacy interface definitions (deprecated - use schemas above)

export interface WaitlistResponseDtoLegacy {
  id: number;
  sessionId: number;
  position: number;
  notifiedAt: string | null;
  notificationExpiresAt: string | null;
  createdAt: string;
}

export interface WaitlistWithSessionDtoLegacy
  extends WaitlistResponseDtoLegacy {
  session: {
    id: number;
    startAt: string;
    endAt: string;
    type: string;
    groupClass?: {
      id: number;
      title: string;
      levels: Array<{
        code: string;
        name: string;
      }>;
    };
  };
}

export interface WaitlistWithStudentDtoLegacy
  extends WaitlistResponseDtoLegacy {
  student: {
    id: number;
    userId: number;
    name: string;
    email: string;
  };
}
