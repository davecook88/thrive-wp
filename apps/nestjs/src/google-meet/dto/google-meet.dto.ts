import { z } from "zod";

/**
 * Response from Google OAuth initiation
 */
export const GoogleOAuthInitResponseSchema = z.object({
  authUrl: z.string(),
  state: z.string(),
});
export type GoogleOAuthInitResponseDto = z.infer<
  typeof GoogleOAuthInitResponseSchema
>;

/**
 * Teacher's Google account connection status
 */
export const TeacherGoogleStatusSchema = z.object({
  isConnected: z.boolean(),
  calendarId: z.string().nullable().optional(),
  tokenStatus: z
    .enum(["VALID", "EXPIRED", "REVOKED", "ERROR"])
    .nullable()
    .optional(),
  connectedAt: z.string().datetime().nullable().optional(),
});
export type TeacherGoogleStatusDto = z.infer<typeof TeacherGoogleStatusSchema>;

/**
 * Request to retry Meet creation for a session
 */
export const RetryMeetCreationRequestSchema = z.object({
  sessionId: z.number().int().positive(),
});
export type RetryMeetCreationRequestDto = z.infer<
  typeof RetryMeetCreationRequestSchema
>;

/**
 * Response from Meet retry operation
 */
export const RetryMeetCreationResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.number(),
  meetStatus: z.enum([
    "PENDING",
    "CREATING",
    "READY",
    "UPDATING",
    "ERROR",
    "CANCELED",
  ]),
  meetLink: z.string().nullable().optional(),
  message: z.string().optional(),
});
export type RetryMeetCreationResponseDto = z.infer<
  typeof RetryMeetCreationResponseSchema
>;

/**
 * Meet info for a session
 */
export const SessionMeetInfoSchema = z.object({
  meetLink: z.string().nullable(),
  meetEventId: z.string().nullable(),
  meetStatus: z.enum([
    "PENDING",
    "CREATING",
    "READY",
    "UPDATING",
    "ERROR",
    "CANCELED",
  ]),
});
export type SessionMeetInfoDto = z.infer<typeof SessionMeetInfoSchema>;
