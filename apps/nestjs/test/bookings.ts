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
export const BookingResponseSchema = z.union([
  // Success response
  z.object({
    id: z.number().int().positive(),
    status: BookingStatusSchema,
    studentPackageId: z.number().int().positive().nullable(),
    creditsCost: z.number().int().positive().nullable(),
  }),
  // Error response
  z.object({
    message: z.string(),
  }),
]);

export type BookingResponse = z.infer<typeof BookingResponseSchema>;
