/**
 * Credit Tier System
 *
 * This module provides utilities for calculating and validating credit tiers
 * for session bookings. The tier system determines which package credits can
 * be used for which sessions.
 *
 * Key principle: A credit can be used for any session with an equal or lower tier.
 *
 * @see docs/credit-tiers-system.md for complete documentation
 */

import { ServiceType } from "./class-types.js";
import type { Session } from "../../sessions/entities/session.entity.js";
import type { StudentPackage } from "../../packages/entities/student-package.entity.js";

/**
 * Base tier values for each service type.
 * These are internal values not exposed to users.
 */
export const SERVICE_TYPE_BASE_TIERS = {
  [ServiceType.PRIVATE]: 100,
  [ServiceType.GROUP]: 50,
  [ServiceType.COURSE]: 0, // Course sessions use enrollment, not credits
} as const;

/**
 * Calculate the tier of a session.
 * Session tier = Base service tier + teacher tier
 *
 * @param session - Session entity with teacher relation loaded
 * @returns Numeric tier value
 */
export function getSessionTier(session: Session): number {
  const baseServiceTier = SERVICE_TYPE_BASE_TIERS[session.type] ?? 0;
  const teacherTier = session.teacher?.tier ?? 0;

  return baseServiceTier + teacherTier;
}

/**
 * Calculate the tier of a package based on its metadata.
 * Package tier = Base service tier + package teacher tier requirement
 *
 * @param pkg - StudentPackage entity with metadata
 * @returns Numeric tier value
 */
export function getPackageTier(pkg: StudentPackage): number {
  const serviceType =
    (pkg.metadata?.service_type as ServiceType) || ServiceType.PRIVATE;
  const baseServiceTier = SERVICE_TYPE_BASE_TIERS[serviceType] ?? 0;

  // Parse teacher tier from metadata (stored as string in Stripe metadata)
  const teacherTierRaw = pkg.metadata?.teacher_tier;
  const teacherTier = teacherTierRaw
    ? typeof teacherTierRaw === "string"
      ? parseInt(teacherTierRaw, 10)
      : (teacherTierRaw as number)
    : 0;

  return baseServiceTier + (Number.isFinite(teacherTier) ? teacherTier : 0);
}

/**
 * Determine if a package can be used to book a session based on tier comparison.
 *
 * Rules:
 * - COURSE sessions cannot use package credits (use enrollment instead)
 * - Package tier must be >= session tier
 *
 * @param pkg - StudentPackage entity
 * @param session - Session entity with teacher relation loaded
 * @returns true if package can be used for session
 */
export function canUsePackageForSession(
  pkg: StudentPackage,
  session: Session,
): boolean {
  // Course sessions require enrollment, not package credits
  if (session.type === ServiceType.COURSE) {
    return false;
  }

  const packageTier = getPackageTier(pkg);
  const sessionTier = getSessionTier(session);

  // Can use equal or higher tier credit
  return packageTier >= sessionTier;
}

/**
 * Get user-facing display label for a package.
 * Labels are friendly strings like "Private Credit" or "Premium Group Credit".
 *
 * @param pkg - StudentPackage entity with metadata
 * @returns User-friendly label string
 */
export function getPackageDisplayLabel(pkg: StudentPackage): string {
  const serviceType =
    (pkg.metadata?.service_type as ServiceType) || ServiceType.PRIVATE;

  // Parse teacher tier from metadata
  const teacherTierRaw = pkg.metadata?.teacher_tier;
  const teacherTier = teacherTierRaw
    ? typeof teacherTierRaw === "string"
      ? parseInt(teacherTierRaw, 10)
      : (teacherTierRaw as number)
    : 0;

  const isPremium = Number.isFinite(teacherTier) && teacherTier > 0;

  if (serviceType === ServiceType.PRIVATE) {
    return isPremium ? "Premium Private Credit" : "Private Credit";
  } else if (serviceType === ServiceType.GROUP) {
    return isPremium ? "Premium Group Credit" : "Group Credit";
  }

  return "Course Credit";
}

/**
 * Determine if a booking is "cross-tier" (using higher-tier credit for lower-tier session).
 * This is used to determine if user confirmation is required.
 *
 * @param pkg - StudentPackage entity
 * @param session - Session entity with teacher relation loaded
 * @returns true if this is a cross-tier booking requiring confirmation
 */
export function isCrossTierBooking(
  pkg: StudentPackage,
  session: Session,
): boolean {
  if (!canUsePackageForSession(pkg, session)) {
    return false; // Not valid at all
  }

  const packageTier = getPackageTier(pkg);
  const sessionTier = getSessionTier(session);

  return packageTier > sessionTier;
}

/**
 * Get a warning message for cross-tier bookings.
 *
 * @param pkg - StudentPackage entity
 * @param session - Session entity
 * @returns Warning message string or null if not cross-tier
 */
export function getCrossTierWarningMessage(
  pkg: StudentPackage,
  session: Session,
): string | null {
  if (!isCrossTierBooking(pkg, session)) {
    return null;
  }

  const packageLabel = getPackageDisplayLabel(pkg);
  const sessionTypeLabel =
    session.type === ServiceType.PRIVATE ? "private class" : "group class";

  return `This will use a ${packageLabel} for a ${sessionTypeLabel}`;
}

/**
 * Calculate the number of credits required for a session.
 * Always rounds up to ensure fair charging.
 *
 * @param sessionDurationMinutes - Session duration in minutes
 * @param creditUnitMinutes - Package credit unit in minutes
 * @returns Number of credits required (integer)
 */
export function calculateCreditsRequired(
  sessionDurationMinutes: number,
  creditUnitMinutes: number,
): number {
  return Math.ceil(sessionDurationMinutes / creditUnitMinutes);
}

/**
 * Check if session duration matches package credit unit.
 * Used to show warnings when using mismatched durations.
 *
 * @param sessionDurationMinutes - Session duration in minutes
 * @param creditUnitMinutes - Package credit unit in minutes
 * @returns true if there's a mismatch
 */
export function hasDurationMismatch(
  sessionDurationMinutes: number,
  creditUnitMinutes: number,
): boolean {
  return sessionDurationMinutes !== creditUnitMinutes;
}

/**
 * Get a warning message for duration mismatches.
 *
 * @param sessionDurationMinutes - Session duration in minutes
 * @param creditUnitMinutes - Package credit unit in minutes
 * @returns Warning message or null if no mismatch
 */
export function getDurationMismatchWarning(
  sessionDurationMinutes: number,
  creditUnitMinutes: number,
): string | null {
  if (!hasDurationMismatch(sessionDurationMinutes, creditUnitMinutes)) {
    return null;
  }

  const creditsRequired = calculateCreditsRequired(
    sessionDurationMinutes,
    creditUnitMinutes,
  );

  if (sessionDurationMinutes < creditUnitMinutes) {
    const unusedMinutes = creditUnitMinutes - sessionDurationMinutes;
    return `This session is ${sessionDurationMinutes} minutes, but your credit is for ${creditUnitMinutes} minutes. You'll use ${creditsRequired} credit${creditsRequired > 1 ? "s" : ""} and ${unusedMinutes} minutes will not be saved.`;
  } else {
    return `This session requires ${creditsRequired} of your ${creditUnitMinutes}-minute credits (total: ${sessionDurationMinutes} minutes)`;
  }
}
