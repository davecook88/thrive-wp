import { z } from 'zod';

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
