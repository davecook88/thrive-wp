import { z } from "zod";
import { ServiceType } from "./class-types.js";

// Server & client shared Zod schemas for Payments API
export const CreatePaymentIntentSchema = z.object({
  start: z.iso.datetime(),
  end: z.iso.datetime(),
  teacher: z.number().int().positive(),
  serviceType: z.enum(ServiceType),
  notes: z.string().optional(),
});

export type CreatePaymentIntentDto = z.infer<typeof CreatePaymentIntentSchema>;

// Legacy booking data schema for private sessions
export const PrivateSessionBookingDataSchema = z.object({
  type: z.literal("private"),
  teacherId: z.number().int().positive(),
  start: z.iso.datetime(),
  end: z.iso.datetime(),
  serviceType: z
    .enum(ServiceType)
    .optional()
    .default(() => "PRIVATE" as ServiceType),
});

// Group class booking data schema with sessionId
export const GroupSessionBookingDataSchema = z.object({
  type: z.literal("group"),
  sessionId: z.number().int().positive(),
  serviceType: z.literal(ServiceType.GROUP),
});

// Union type for either booking method
export const CreateSessionBookingDataSchema = z.discriminatedUnion("type", [
  PrivateSessionBookingDataSchema,
  GroupSessionBookingDataSchema,
]);

export const CreateSessionSchema = z.object({
  priceId: z.string().min(1),
  bookingData: CreateSessionBookingDataSchema,
});

export type PrivateSessionBookingData = z.infer<
  typeof PrivateSessionBookingDataSchema
>;
export type GroupSessionBookingData = z.infer<
  typeof GroupSessionBookingDataSchema
>;
export type CreateSessionBookingData = z.infer<
  typeof CreateSessionBookingDataSchema
>;
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
