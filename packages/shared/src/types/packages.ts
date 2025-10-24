import { z } from "zod";
import { ServiceType } from "./class-types.js";

/**
 * PackageAllowance describes one service type's allocation within a bundle.
 * Example: "5 PRIVATE credits @ 30 min each"
 */
export const PackageAllowanceSchema = z.object({
  id: z.number().int().positive(),
  serviceType: z.enum(ServiceType),
  teacherTier: z.number().int().nonnegative().default(0),
  credits: z.number().int().positive(),
  creditUnitMinutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
  ]),
});

export type PackageAllowance = z.infer<typeof PackageAllowanceSchema>;

/**
 * Create bundle packages with multiple service type allowances.
 * A bundle can contain PRIVATE, GROUP, and/or COURSE credits.
 */
export const CreatePackageSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),

  // NEW: Array of allowances instead of single serviceType
  allowances: z.array(PackageAllowanceSchema).min(1),

  // Optional custom bundle description; auto-generated if not provided
  bundleDescription: z.string().optional(),

  expiresInDays: z.number().int().positive().nullable().optional(),
  currency: z.string().length(3).default("USD"),
  amountMinor: z.number().int().positive(),
  lookupKey: z.string().optional(),
  scope: z.string().default("global"),
});

export type CreatePackageDto = z.infer<typeof CreatePackageSchema>;

/**
 * Package response includes all allowances and bundle details.
 */
export const PackageResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  bundleDescription: z.string(),
  allowances: z.array(PackageAllowanceSchema),
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

/**
 * Backward-compatible StudentPackage with computed balances.
 * remainingSessions is computed from PackageUse records.
 */
export type StudentPackageMyCreditsResponse = {
  packages: StudentPackage[];
  totalRemaining: number;
};

export type StudentPackage = {
  id: number;
  packageName: string;
  totalSessions: number;
  remainingSessions: number; // Computed: totalSessions - SUM(creditsUsed from PackageUse)
  purchasedAt: string; // ISO date string
  expiresAt: string | null; // ISO date string or null
};

/**
 * Compatible package for a session, with computed remaining credits.
 * Now includes allowanceId to identify which specific allowance within the package.
 */
export const CompatiblePackageSchema = z.object({
  id: z.number(), // Student package ID
  allowanceId: z.number(), // Specific allowance ID within the package
  packageName: z.string(), // Package name for display
  label: z.string(), // Allowance label (e.g., "Private Credit", "Premium Group Credit")
  remainingSessions: z.number(), // Computed from PackageUse for this specific allowance
  expiresAt: z.string().nullable(),
  creditUnitMinutes: z.number(),
  tier: z.number(),
  serviceType: z.enum(ServiceType), // Service type of this allowance
  teacherTier: z.number(), // Teacher tier of this allowance
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
