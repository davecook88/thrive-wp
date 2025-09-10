import { z } from 'zod';

/**
 * Enumeration of class/session types.
 * Currently only supports private classes - can be extended later.
 */
export enum ServiceType {
  PRIVATE = 'PRIVATE',
}

/**
 * Zod schema for validating ServiceType enum values.
 */
export const ServiceTypeSchema = z.enum(ServiceType);

/**
 * Service key for Stripe product mappings.
 * Currently only supports private classes.
 */
export enum ServiceKey {
  PRIVATE_CLASS = 'PRIVATE',
}

/**
 * Zod schema for validating ServiceKey enum values.
 */
export const ServiceKeySchema = z.nativeEnum(ServiceKey);

/**
 * Convert ServiceType to ServiceKey.
 * For now, all private sessions use the same Stripe product.
 */
export function serviceTypeToServiceKey(serviceType: ServiceType): ServiceKey {
  return ServiceKey.PRIVATE_CLASS;
}
