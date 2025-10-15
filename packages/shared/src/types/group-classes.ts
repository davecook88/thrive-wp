import { z } from "zod";

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
  startAt: z.date(),
  endAt: z.date(),
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

// Booking Creation Request Schema
export const CreateBookingRequestSchema = z.object({
  sessionId: z.number().int().positive(),
  studentPackageId: z.number().int().positive().optional(),
  confirmed: z.boolean().optional(),
});

export type CreateBookingRequest = z.infer<typeof CreateBookingRequestSchema>;
