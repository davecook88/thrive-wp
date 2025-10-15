import { z } from "zod";

export enum BookingStatus {
  /** Student has been invited to the session but has not yet accepted */
  INVITED = "INVITED",

  /** Student has confirmed their attendance (either accepted invitation or completed payment) */
  CONFIRMED = "CONFIRMED",

  /** Booking was cancelled by student or admin */
  CANCELLED = "CANCELLED",

  /** Student did not attend a confirmed session */
  NO_SHOW = "NO_SHOW",

  /** Student forfeited their spot (e.g., late cancellation with penalty) */
  FORFEIT = "FORFEIT",

  /** Booking created but awaiting payment confirmation from Stripe webhook */
  PENDING = "PENDING",

  /**
   * @deprecated Never actually created in codebase; use PENDING instead
   */
  DRAFT = "DRAFT",
}

export const BookingStatusSchema = z.enum(BookingStatus);

// Response schemas used by frontend
export const BookingResponseSchema = z.object({
  id: z.number().int().positive(),
  status: BookingStatusSchema,
  studentPackageId: z.number().int().positive().nullable(),
  creditsCost: z.number().int().positive().nullable(),
});

export type BookingResponse = z.infer<typeof BookingResponseSchema>;

export const BookingCancellationResponseSchema = z.object({
  success: z.boolean(),
  creditRefunded: z.boolean(),
  refundedToPackageId: z.number().int().positive(),
});

export type BookingCancellationResponse = z.infer<
  typeof BookingCancellationResponseSchema
>;

export const BookWithPackagePayloadSchema = z.object({
  packageId: z.number().positive("Package ID must be positive"),
  sessionId: z.number().positive("Session ID must be positive"),
  confirmed: z.boolean().optional(),
});

export type BookWithPackagePayloadDto = z.infer<
  typeof BookWithPackagePayloadSchema
>;

export const CancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export type CancelBookingDto = z.infer<typeof CancelBookingSchema>;
