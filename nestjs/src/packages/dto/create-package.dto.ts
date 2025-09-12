import { z } from 'zod';

export const CreatePackageSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  serviceType: z.enum(['PRIVATE']),
  credits: z.number().int().positive(),
  creditUnitMinutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
  ]),
  expiresInDays: z.union([z.number().int().positive(), z.null()]).optional(),
  currency: z.string().length(3).default('USD'),
  amountMinor: z.number().int().positive(),
  lookupKey: z.string().optional(),
  scope: z.string().default('global'),
});

export type CreatePackageDto = z.infer<typeof CreatePackageSchema>;
