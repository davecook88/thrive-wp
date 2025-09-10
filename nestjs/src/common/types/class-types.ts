import { z } from 'zod';

/**
 * Enumeration of class/session types.
 * This is the single source of truth for class type definitions across the entire application.
 */
export enum ServiceType {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP',
  COURSE = 'COURSE',
}

/**
 * Zod schema for validating ServiceType enum values.
 * Use this for runtime validation of class type values.
 */
export const ServiceTypeSchema = z.nativeEnum(ServiceType);

/**
 * Service key mappings for Stripe product mappings.
 * These keys are used to identify products in the stripe_product_map table.
 */
export enum ServiceKey {
  PRIVATE_CLASS = 'PRIVATE_CLASS',
  GROUP_CLASS = 'GROUP_CLASS',
  COURSE_CLASS = 'COURSE_CLASS',
}

/**
 * Zod schema for validating ServiceKey enum values.
 */
export const ServiceKeySchema = z.nativeEnum(ServiceKey);

/**
 * Mapping from ServiceType to ServiceKey for easy conversion.
 */
export const ServiceTypeToServiceKey: Record<ServiceType, ServiceKey> = {
  [ServiceType.PRIVATE]: ServiceKey.PRIVATE_CLASS,
  [ServiceType.GROUP]: ServiceKey.GROUP_CLASS,
  [ServiceType.COURSE]: ServiceKey.COURSE_CLASS,
};

/**
 * Mapping from ServiceKey to ServiceType for easy conversion.
 */
export const ServiceKeyToServiceType: Record<ServiceKey, ServiceType> = {
  [ServiceKey.PRIVATE_CLASS]: ServiceType.PRIVATE,
  [ServiceKey.GROUP_CLASS]: ServiceType.GROUP,
  [ServiceKey.COURSE_CLASS]: ServiceType.COURSE,
};

/**
 * Type guard to check if a string is a valid ServiceType.
 */
export function isServiceType(value: string): value is ServiceType {
  return Object.values(ServiceType).includes(value as ServiceType);
}

/**
 * Type guard to check if a string is a valid ServiceKey.
 */
export function isServiceKey(value: string): value is ServiceKey {
  return Object.values(ServiceKey).includes(value as ServiceKey);
}

/**
 * Convert ServiceType to ServiceKey.
 */
export function serviceTypeToServiceKey(serviceType: ServiceType): ServiceKey {
  return ServiceTypeToServiceKey[serviceType];
}

/**
 * Convert ServiceKey to ServiceType.
 */
export function serviceKeyToServiceType(serviceKey: ServiceKey): ServiceType {
  return ServiceKeyToServiceType[serviceKey];
}
