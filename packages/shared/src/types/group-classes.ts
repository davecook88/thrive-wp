import { z } from "zod";
import { PublicTeacherSchema } from "./teachers.js";
import { LevelSchema } from "./level.js";

// Session DTO Schema - for editing sessions
export const SessionDtoSchema = z.object({
  id: z.number().int().positive(),
  startAt: z.string(),
  endAt: z.string(),
  status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]),
  enrolledCount: z.number().int().nonnegative().optional(),
  teacherId: z.number().int().positive().optional(),
  capacityMax: z.number().int().positive().optional(),
  description: z.string().optional(),
  meetingUrl: z.string().nullable().optional(),
});

export type SessionDto = z.infer<typeof SessionDtoSchema>;

// Update Session Request Schema
export const UpdateSessionRequestSchema = z.object({
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]).optional(),
  teacherId: z.number().int().positive().optional(),
  capacityMax: z.number().int().positive().optional(),
  description: z.string().optional(),
  meetingUrl: z.string().nullable().optional(),
});

export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequestSchema>;

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

// Create Group Class Schema
export const CreateGroupClassSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  levelIds: z.array(z.number().int().positive()),
  capacityMax: z.number().int().positive().optional(),
  teacherIds: z.array(z.number().int().positive()),
  primaryTeacherId: z.number().int().positive().nullable().optional(),
  // Recurring schedule fields (used to generate multiple GroupClasses)
  rrule: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  sessionStartTime: z.string().nullable().optional(), // e.g., "14:00"
  sessionDuration: z.number().int().positive().optional(), // in minutes
  // One-off sessions (creates one GroupClass per session)
  sessions: z
    .array(
      z.object({
        startAt: z.string(),
        endAt: z.string(),
      }),
    )
    .optional(),
});

export type CreateGroupClassDto = z.infer<typeof CreateGroupClassSchema>;

export const PatchGroupClassSchema = CreateGroupClassSchema.extend({
  title: z.string().min(1).optional(),
  levelIds: z.array(z.number().int().positive()).optional(),
  teacherIds: z.array(z.number().int().positive()).optional(),
});

export type PatchGroupClassDto = z.infer<typeof PatchGroupClassSchema>;

// Group Class List Schema
export const GroupClassListSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  description: z.string().nullable(),
  capacityMax: z.number().int().positive(),
  isActive: z.boolean(),
  levels: z.array(
    z.object({
      id: z.number().int().positive(),
      code: z.string(),
      name: z.string(),
    }),
  ),
  teachers: z.array(
    z.object({
      teacherId: z.number().int().positive(),
      userId: z.number().int().positive(),
      name: z.string(),
      isPrimary: z.boolean(),
    }),
  ),
  upcomingSessionsCount: z.number().int().nonnegative(),
  sessions: z
    .array(
      z.object({
        id: z.number().int().positive(),
        startAt: z.coerce.date(),
        endAt: z.coerce.date(),
        status: z.string(),
        enrolledCount: z.number().int().nonnegative(),
        waitlistCount: z.number().int().nonnegative(),
      }),
    )
    .optional(),
});

export type GroupClassListDto = z.infer<typeof GroupClassListSchema>;
