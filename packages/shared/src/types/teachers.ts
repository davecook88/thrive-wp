import { z } from "zod";
import { ServiceType } from "./class-types.js";

// Location DTO for updates
export const LocationInputSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type LocationInputDto = z.infer<typeof LocationInputSchema>;

// Public teacher DTO
export const PublicTeacherSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  tier: z.number().int().default(10),
  birthplace: LocationInputSchema,
  currentLocation: LocationInputSchema,
  displayName: z.string(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  languagesSpoken: z.array(z.string()),
  levels: z.array(z.number()),
  specialties: z.array(z.string()),
  rating: z.number().nullable(),
  isActive: z.boolean(),
  initials: z.string(),
  yearsExperience: z.number().int().nullable(),
});
export type PublicTeacherDto = z.infer<typeof PublicTeacherSchema>;

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

export type WeeklyAvailabilityRule = z.infer<
  typeof WeeklyAvailabilityRuleSchema
>;

export const AvailabilityExceptionSchema = z.object({
  id: z.number().int().optional(),
  date: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isBlackout: z.boolean().optional(),
});

export type AvailabilityException = z.infer<typeof AvailabilityExceptionSchema>;

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
  teacherIds: z.array(z.number().int()),
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
  start: z.iso.datetime(),
  end: z.iso.datetime(),
  timezone: z.string().optional(),
  serviceType: z.enum(ServiceType).optional(),
});
export type PreviewAvailabilityDto = z.infer<typeof PreviewAvailabilitySchema>;

// Preview for authenticated teacher (no teacherId required)
export const PreviewMyAvailabilitySchema = PreviewAvailabilitySchema.omit({
  teacherId: true,
  teacherIds: true,
});
export type PreviewMyAvailabilityDto = z.infer<
  typeof PreviewMyAvailabilitySchema
>;

// Update profile DTO
export const UpdateTeacherProfileSchema = z.object({
  bio: z.string().nullable().optional(),
  avatarUrl: z
    .string()
    .refine(
      (url) => !url || /^https?:\/\/.+/.test(url),
      "avatarUrl must be a valid URL starting with http:// or https://",
    )
    .nullable()
    .optional(),
  birthplace: LocationInputSchema.optional(),
  currentLocation: LocationInputSchema.optional(),
  specialties: z.array(z.string()).optional(),
  yearsExperience: z.number().int().min(0).max(100).optional(),
  languagesSpoken: z.array(z.string()).optional(),
});
export type UpdateTeacherProfileDto = z.infer<
  typeof UpdateTeacherProfileSchema
>;

// Update availability DTO
export const UpdateAvailabilitySchema = z.object({
  rules: z.array(WeeklyAvailabilityRuleSchema.omit({ id: true })),
  exceptions: z
    .array(AvailabilityExceptionSchema.omit({ id: true }))
    .optional(),
});
export type UpdateAvailabilityDto = z.infer<typeof UpdateAvailabilitySchema>;

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
