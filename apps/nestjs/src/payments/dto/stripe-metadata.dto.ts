import { z } from "zod";
import { ServiceType } from "../../common/types/class-types.js";

/**
 * Base metadata schema for all Stripe objects.
 * This provides a consistent structure for tracking what payments relate to.
 */
export const StripeMetadataSchema = z.object({
  // Core identifiers
  order_id: z.string().optional(),
  student_id: z.string().optional(),
  user_id: z.string().optional(),

  // Session/booking details
  session_id: z.string().optional(),
  booking_id: z.string().optional(),

  // Service details
  service_type: z.enum(ServiceType).optional(),
  teacher_id: z.string().optional(),
  start_at: z.string().optional(),
  end_at: z.string().optional(),

  // Product details
  product_id: z.string().optional(),
  price_id: z.string().optional(),

  // Additional context
  notes: z.string().optional(),
  source: z.string().optional(), // e.g., 'web', 'api', 'admin'
});

export type StripeMetadata = z.infer<typeof StripeMetadataSchema>;

/**
 * Metadata for PaymentIntent objects
 */
export const PaymentIntentMetadataSchema = StripeMetadataSchema.extend({
  student_id: z.string(),
  user_id: z.string(),
  service_type: z.enum(ServiceType),
  teacher_id: z.string(),
  start_at: z.string(),
  end_at: z.string(),
  product_id: z.string(),
  price_id: z.string().optional(),
  source: z.string().default("api"),
});

export type PaymentIntentMetadata = z.infer<typeof PaymentIntentMetadataSchema>;

/**
 * Metadata for Customer objects
 */
export const CustomerMetadataSchema = z.object({
  user_id: z.string(),
  student_id: z.string(),
  source: z.string().default("api"),
});

export type CustomerMetadata = z.infer<typeof CustomerMetadataSchema>;

/**
 * Metadata for Product objects
 */
export const ProductMetadataSchema = z.object({
  service_type: z.enum(ServiceType),
  service_key: z.string(),
  description: z.string().optional(),
  source: z.string().default("api"),
});

export type ProductMetadata = z.infer<typeof ProductMetadataSchema>;

/**
 * Metadata for Price objects
 */
export const PriceMetadataSchema = z.object({
  service_type: z.enum(ServiceType),
  teacher_id: z.string().optional(),
  duration_minutes: z.string().optional(),
  source: z.string().default("api"),
});

/**
 * Parsed metadata from Stripe webhooks (after fromStripeFormat conversion)
 */
export type ParsedStripeMetadata = Record<
  string,
  string | number | boolean | null
>;

/**
 * Utility functions for working with Stripe metadata
 */
export class StripeMetadataUtils {
  /**
   * Convert metadata object to Stripe-compatible format (string values only)
   */
  static toStripeFormat(metadata: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value !== null && value !== undefined) {
        result[key] = String(value);
      }
    }

    return result;
  }

  /**
   * Parse metadata from Stripe format back to typed object
   */
  static fromStripeFormat(
    metadata: Record<string, string>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Try to parse numbers
      if (/^\d+$/.test(value)) {
        result[key] = parseInt(value, 10);
      }
      // Try to parse booleans
      else if (value === "true" || value === "false") {
        result[key] = value === "true";
      }
      // Keep as string
      else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Create payment intent metadata from booking/session request
   */
  static createPaymentIntentMetadata(params: {
    studentId: number;
    userId: number;
    serviceType: ServiceType;
    teacherId: number;
    startAt: string;
    endAt: string;
    productId: string;
    priceId?: string;
    notes?: string;
    source?: string;
  }): PaymentIntentMetadata {
    return {
      student_id: params.studentId.toString(),
      user_id: params.userId.toString(),
      service_type: params.serviceType,
      teacher_id: params.teacherId.toString(),
      start_at: params.startAt,
      end_at: params.endAt,
      product_id: params.productId,
      price_id: params.priceId,
      notes: params.notes,
      source: params.source || "api",
    };
  }

  /**
   * Create customer metadata
   */
  static createCustomerMetadata(params: {
    userId: number;
    studentId: number;
    source?: string;
  }): CustomerMetadata {
    return {
      user_id: params.userId.toString(),
      student_id: params.studentId.toString(),
      source: params.source || "api",
    };
  }

  /**
   * Create product metadata
   */
  static createProductMetadata(params: {
    serviceType: ServiceType;
    serviceKey: string;
    description?: string;
    source?: string;
  }): ProductMetadata {
    return {
      service_type: params.serviceType,
      service_key: params.serviceKey,
      description: params.description,
      source: params.source || "api",
    };
  }

  /**
   * Create price metadata
   */
  //   static createPriceMetadata(params: {
  //     serviceType: ServiceType;
  //     teacherId?: number;
  //     durationMinutes?: number;
  //     source?: string;
  //   }): PriceMetadata {
  //     return {
  //       service_type: params.serviceType,
  //       teacher_id: params.teacherId?.toString(),
  //       duration_minutes: params.durationMinutes?.toString(),
  //       source: params.source || 'api',
  //     };
  //   }
}
