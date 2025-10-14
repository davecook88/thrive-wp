import { z } from "zod";
import { ServiceType } from "./class-types";

// Public teacher DTO
export const PublicTeacherSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  displayName: z.string(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  languages: z.array(z.string()).optional(),
  levels: z.array(z.number()).optional(),
  specialties: z.array(z.string()).optional(),
  rating: z.number().optional(),
  isActive: z.boolean(),
  initials: z.string(),
});
export type PublicTeacherDto = z.infer<typeof PublicTeacherSchema>;

// API shape used by some endpoints (wordpress/NestJS bridge)
export const PublicTeacherApiSchema = z.object({
  teacherId: z.number().int(),
  userId: z.number().int(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  birthplace: z
    .object({ city: z.string().optional(), country: z.string().optional() })
    .nullable()
    .optional(),
  currentLocation: z
    .object({ city: z.string().optional(), country: z.string().optional() })
    .nullable()
    .optional(),
  languagesSpoken: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  yearsExperience: z.number().int().nullable().optional(),
});
export type PublicTeacherApiDto = z.infer<typeof PublicTeacherApiSchema>;

// Teacher detail (authenticated)
export const TeacherDetailSchema = PublicTeacherSchema.extend({
  contactEmail: z.email().nullable().optional(),
  profileComplete: z.boolean(),
  availabilitySummary: z
    .object({
      nextAvailable: z.iso.datetime().nullable().optional(),
      zonesCovered: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  pricing: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type TeacherDetailDto = z.infer<typeof TeacherDetailSchema>;

// Availability types
export const WeeklyAvailabilityRuleSchema = z.object({
  id: z.number().int().optional(),
  dayOfWeek: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  startTime: z.string(),
  endTime: z.string(),
  maxBookings: z.number().int().nullable().optional(),
});

export const AvailabilityExceptionSchema = z.object({
  id: z.number().int().optional(),
  date: z.string(),
  start: z.string().datetime().nullable().optional(),
  end: z.string().datetime().nullable().optional(),
  isAvailable: z.boolean(),
  note: z.string().nullable().optional(),
});

export const GetAvailabilityResponseSchema = z.object({
  timezone: z.string(),
  rules: z.array(WeeklyAvailabilityRuleSchema),
  exceptions: z.array(AvailabilityExceptionSchema),
});
export type GetAvailabilityResponse = z.infer<
  typeof GetAvailabilityResponseSchema
>;

export const AvailabilityWindowSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  available: z.boolean(),
  reason: z.string().optional(),
});

export const PreviewAvailabilityResponseSchema = z.object({
  windows: z.array(AvailabilityWindowSchema),
});

export type PreviewAvailabilityResponse = z.infer<
  typeof PreviewAvailabilityResponseSchema
>;

// Preview DTO (public)
export const PreviewAvailabilitySchema = z.object({
  teacherId: z.number().int().optional(),
  teacherIds: z.array(z.number().int()).optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  timezone: z.string().optional(),
  serviceType: z.nativeEnum(ServiceType).optional(),
});
export type PreviewAvailabilityDto = z.infer<typeof PreviewAvailabilitySchema>;

// Preview for authenticated teacher (no teacherId required)
export const PreviewMyAvailabilitySchema = PreviewAvailabilitySchema.omit({
  teacherId: true,
})
  .extend({})
  .partial();
export type PreviewMyAvailabilityDto = z.infer<
  typeof PreviewMyAvailabilitySchema
>;

// Profile types
export const TeacherProfileSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  headline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  languages: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  pricing: z
    .object({ private: z.number().optional(), group: z.number().optional() })
    .nullable()
    .optional(),
  availabilityPreview: GetAvailabilityResponseSchema.nullable().optional(),
});
export type TeacherProfileDto = z.infer<typeof TeacherProfileSchema>;

// Update profile DTO
export const UpdateTeacherProfileSchema = z.object({
  headline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  languages: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  pricing: z
    .object({ private: z.number().optional(), group: z.number().optional() })
    .nullable()
    .optional(),
});
export type UpdateTeacherProfileDto = z.infer<
  typeof UpdateTeacherProfileSchema
>;

// Stats
export const TeacherStatsSchema = z.object({
  totalHoursTaught: z.number(),
  totalStudents: z.number(),
  upcomingSessionsCount: z.number(),
  earningsPeriod: z
    .array(z.object({ start: z.string(), end: z.string(), amount: z.number() }))
    .optional(),
});
export type TeacherStatsDto = z.infer<typeof TeacherStatsSchema>;

export default {};
