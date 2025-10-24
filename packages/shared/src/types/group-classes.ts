import { z } from "zod";
import { PublicTeacherSchema } from "./teachers.js";
import { LevelSchema } from "./level.js";

// Session with Enrollment Response Schema
export const SessionWithEnrollmentResponseSchema = z.object({
  id: z.number().int().positive(),
  type: z.string(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  capacityMax: z.number().int().positive(),
  status: z.string(),
  meetingUrl: z.string().nullable(),
  teacherId: z.number().int().positive(),
  groupClassId: z.number().int().positive().nullable(),
  groupClass: z
    .object({
      id: z.number().int().positive(),
      title: z.string(),
      level: LevelSchema,
    })
    .nullable(),
  enrolledCount: z.number().int().nonnegative(),
  availableSpots: z.number().int().nonnegative(),
  isFull: z.boolean(),
  canJoinWaitlist: z.boolean(),
  teacher: PublicTeacherSchema.nullable(),
});

export type SessionWithEnrollmentResponse = z.infer<
  typeof SessionWithEnrollmentResponseSchema
>;

// Group Class Creation Response Schema
export const CreateGroupClassResponseSchema = z.object({
  id: z.number().int().positive(),
});

export type CreateGroupClassResponse = z.infer<
  typeof CreateGroupClassResponseSchema
>;

// Available Session Schema
export const AvailableSessionSchema = z.object({
  id: z.number().int().positive(),
  sessionId: z.number().int().positive(), // Alias for id
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  capacityMax: z.number().int().positive(),
  enrolledCount: z.number().int().nonnegative(),
  availableSpots: z.number().int().nonnegative(),
  isFull: z.boolean(),
  canJoinWaitlist: z.boolean(),
  teacherId: z.number().int().positive(),
  groupClassId: z.number().int().positive().nullable(),
  status: z.string(),
  meetingUrl: z.string().nullable(),
});

export type AvailableSession = z.infer<typeof AvailableSessionSchema>;

// Available Sessions Response Schema
export const AvailableSessionsResponseSchema = z.array(AvailableSessionSchema);

export type AvailableSessionsResponse = z.infer<
  typeof AvailableSessionsResponseSchema
>;

// Booking Creation Response Schema
export const CreateBookingResponseSchema = z.object({
  bookingId: z.number().int().positive(),
  status: z.string(),
});

export type CreateBookingResponse = z.infer<typeof CreateBookingResponseSchema>;

// Booking Data Schema (for creating new sessions from availability)
export const BookingDataSchema = z.object({
  teacherId: z.number().int().positive(),
  startAt: z.string(),
  endAt: z.string(),
});

export type BookingData = z.infer<typeof BookingDataSchema>;

// Booking Creation Request Schema
// Supports two flows:
// 1. Book existing session: provide sessionId
// 2. Create and book new session: provide bookingData
export const CreateBookingRequestSchema = z
  .object({
    sessionId: z.number().int().positive().optional(),
    bookingData: BookingDataSchema.optional(),
    studentPackageId: z.number().int().positive(),
    allowanceId: z.number().int().positive(),
    confirmed: z.boolean().optional(),
  })
  .refine(
    (data) => data.sessionId !== undefined || data.bookingData !== undefined,
    {
      message: "Either sessionId or bookingData must be provided",
    },
  );

export type CreateBookingRequest = z.infer<typeof CreateBookingRequestSchema>;
