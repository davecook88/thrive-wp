import { z } from "zod";

/**
 * Status of the Google Meet event lifecycle
 */
export const MeetEventStatusSchema = z.enum([
  "PENDING",
  "CREATING",
  "READY",
  "UPDATING",
  "ERROR",
  "CANCELED",
]);
export type MeetEventStatus = z.infer<typeof MeetEventStatusSchema>;

/**
 * Status of the Google OAuth token
 */
export const GoogleTokenStatusSchema = z.enum([
  "VALID",
  "EXPIRED",
  "REVOKED",
  "ERROR",
]);
export type GoogleTokenStatus = z.infer<typeof GoogleTokenStatusSchema>;

/**
 * Meet information included in session responses
 */
export const SessionMeetInfoSchema = z.object({
  meetLink: z.string().nullable(),
  meetEventId: z.string().nullable(),
  meetStatus: MeetEventStatusSchema,
});
export type SessionMeetInfo = z.infer<typeof SessionMeetInfoSchema>;

/**
 * Teacher's Google account connection status
 */
export const TeacherGoogleStatusSchema = z.object({
  isConnected: z.boolean(),
  calendarId: z.string().nullable().optional(),
  tokenStatus: GoogleTokenStatusSchema.nullable().optional(),
  connectedAt: z.iso.datetime().nullable().optional(),
});
export type TeacherGoogleStatus = z.infer<typeof TeacherGoogleStatusSchema>;

/**
 * Response from Google OAuth initiation
 */
export const GoogleOAuthInitResponseSchema = z.object({
  authUrl: z.string(),
  state: z.string(),
});
export type GoogleOAuthInitResponse = z.infer<
  typeof GoogleOAuthInitResponseSchema
>;

/**
 * Request to retry Meet creation for a session
 */
export const RetryMeetCreationRequestSchema = z.object({
  sessionId: z.number().int().positive(),
});
export type RetryMeetCreationRequest = z.infer<
  typeof RetryMeetCreationRequestSchema
>;

/**
 * Response from Meet retry operation
 */
export const RetryMeetCreationResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.number(),
  meetStatus: MeetEventStatusSchema,
  meetLink: z.string().nullable().optional(),
  message: z.string().optional(),
});
export type RetryMeetCreationResponse = z.infer<
  typeof RetryMeetCreationResponseSchema
>;

/**
 * Event emitted when a session is scheduled
 */
export const SessionScheduledEventSchema = z.object({
  sessionId: z.number().int(),
  teacherId: z.number().int(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  title: z.string().optional(),
});
export type SessionScheduledEvent = z.infer<typeof SessionScheduledEventSchema>;

/**
 * Event emitted when a session is rescheduled
 */
export const SessionRescheduledEventSchema = z.object({
  sessionId: z.number().int(),
  teacherId: z.number().int(),
  oldStartAt: z.iso.datetime(),
  oldEndAt: z.iso.datetime(),
  newStartAt: z.iso.datetime(),
  newEndAt: z.iso.datetime(),
  title: z.string().optional(),
});
export type SessionRescheduledEvent = z.infer<
  typeof SessionRescheduledEventSchema
>;

/**
 * Event emitted when a session is canceled
 */
export const SessionCanceledEventSchema = z.object({
  sessionId: z.number().int(),
  teacherId: z.number().int(),
  reason: z.string().optional(),
});
export type SessionCanceledEvent = z.infer<typeof SessionCanceledEventSchema>;
