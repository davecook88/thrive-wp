import { z } from 'zod';

/**
 * Enumeration of class/session types.
 * Supports private, group, and course sessions.
 */
export enum ServiceType {
  PRIVATE = 'PRIVATE', // One-to-one individual sessions
  GROUP = 'GROUP', // Group classes with enrollment limits
  COURSE = 'COURSE', // Multi-session programs with curriculum
}

/**
 * Zod schema for validating ServiceType enum values.
 */
export const ServiceTypeSchema = z.enum(ServiceType);

/**
 * Service key for Stripe product mappings.
 * Maps service types to Stripe products.
 */
export enum ServiceKey {
  PRIVATE_CLASS = 'PRIVATE_CLASS', // Maps to Stripe products for private sessions
  GROUP_CLASS = 'GROUP_CLASS', // Maps to Stripe products for group classes
  COURSE_CLASS = 'COURSE_CLASS', // Maps to Stripe products for courses
}

/**
 * Zod schema for validating ServiceKey enum values.
 */
export const ServiceKeySchema = z.nativeEnum(ServiceKey);

/**
 * Convert ServiceType to ServiceKey.
 * Maps each service type to its corresponding Stripe product key.
 */
export function serviceTypeToServiceKey(serviceType: ServiceType): ServiceKey {
  switch (serviceType) {
    case ServiceType.PRIVATE:
      return ServiceKey.PRIVATE_CLASS;
    case ServiceType.GROUP:
      return ServiceKey.GROUP_CLASS;
    case ServiceType.COURSE:
      return ServiceKey.COURSE_CLASS;
    default:
      throw new Error(`Unsupported service type: ${serviceType}`);
  }
}
