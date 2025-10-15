import { z } from "zod";
import { ServiceType } from "./class-types.js";

export type StudentPackageMyCreditsResponse = {
  packages: StudentPackage[];
  totalRemaining: 4;
};
export type StudentPackage = {
  id: number;
  packageName: string;
  totalSessions: number;
  remainingSessions: number;
  purchasedAt: string; // ISO date string
  expiresAt: string | null; // ISO date string or null
};

export const CreatePackageSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  serviceType: z.nativeEnum(ServiceType),
  credits: z.number().int().positive(),
  creditUnitMinutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
  ]),
  /** Optional teacher tier restriction (e.g. 10, 20, 30). If omitted, package applies to any tier. */
  teacherTier: z.number().int().positive().nullable().optional(),
  expiresInDays: z.number().int().positive().nullable().optional(),
  currency: z.string().length(3).default("USD"),
  amountMinor: z.number().int().positive(),
  lookupKey: z.string().optional(),
  scope: z.string().default("global"),
});

export type CreatePackageDto = z.infer<typeof CreatePackageSchema>;

export const PackageResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  serviceType: z.string(),
  credits: z.number(),
  creditUnitMinutes: z.number(),
  teacherTier: z.number().nullable().optional(),
  expiresInDays: z.number().nullable().optional(),
  stripe: z.object({
    productId: z.string(),
    priceId: z.string(),
    lookupKey: z.string(),
    unitAmount: z.number(),
    currency: z.string(),
  }),
  active: z.boolean(),
});

export type PackageResponseDto = z.infer<typeof PackageResponseSchema>;

export const CompatiblePackageSchema = z.object({
  id: z.number(),
  label: z.string(),
  remainingSessions: z.number(),
  expiresAt: z.string().nullable(),
  creditUnitMinutes: z.number(),
  tier: z.number(),
});

export type CompatiblePackage = z.infer<typeof CompatiblePackageSchema>;

export const CompatiblePackageWithWarningSchema =
  CompatiblePackageSchema.extend({
    warningMessage: z.string(),
  });

export type CompatiblePackageWithWarning = z.infer<
  typeof CompatiblePackageWithWarningSchema
>;

export const CompatiblePackagesForSessionResponseSchema = z.object({
  exactMatch: z.array(CompatiblePackageSchema),
  higherTier: z.array(CompatiblePackageWithWarningSchema),
  recommended: z.number().nullable(),
  requiresCourseEnrollment: z.boolean(),
  isEnrolledInCourse: z.boolean(),
});

export type CompatiblePackagesForSessionResponseDto = z.infer<
  typeof CompatiblePackagesForSessionResponseSchema
>;
