import { z } from "zod";

// Package schemas
export const PackageSchema = z.object({
  id: z.number(),
  name: z.string(),
  serviceType: z.string(),
  credits: z.number(),
  creditUnitMinutes: z.number(),
  expiresInDays: z.number().optional(),
  stripe: z.object({
    productId: z.string(),
    priceId: z.string(),
    lookupKey: z.string(),
  }),
  active: z.boolean(),
});

export const PackagesResponseSchema = z.array(PackageSchema);

export const CreatePackageRequestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  credits: z.number().min(1),
  creditUnitMinutes: z.number(),
  expiresInDays: z.number().optional(),
  currency: z.string(),
  amountMinor: z.number().min(1),
  lookupKey: z.string().optional(),
  serviceType: z.string(),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional(),
  statusCode: z.number().optional(),
});
