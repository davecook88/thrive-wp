import { z } from "zod";

// Lightweight local ServiceType enum used by payment DTOs.
// This mirrors the enum in NestJS common types. Keep values synchronized.
export enum ServiceType {
  PRIVATE = "PRIVATE",
  GROUP = "GROUP",
  COURSE = "COURSE",
}

// Server & client shared Zod schemas for Payments API
export const CreatePaymentIntentSchema = z.object({
  start: z.iso.datetime(),
  end: z.iso.datetime(),
  teacher: z.number().int().positive(),
  serviceType: z.enum(ServiceType),
  notes: z.string().optional(),
});

export type CreatePaymentIntentDto = z.infer<typeof CreatePaymentIntentSchema>;

export const CreateSessionBookingDataSchema = z.object({
  teacherId: z.number().int().positive(),
  start: z.iso.datetime(),
  end: z.iso.datetime(),
});

export const CreateSessionSchema = z.object({
  priceId: z.string().min(1),
  bookingData: CreateSessionBookingDataSchema,
});

export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;

// Response schemas used by frontend
export const StripeKeyResponseSchema = z.object({
  publishableKey: z.string().min(1),
});

export const CreateSessionResponseSchema = z.object({
  clientSecret: z.string().min(1),
});

export type StripeKeyResponse = z.infer<typeof StripeKeyResponseSchema>;
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;
