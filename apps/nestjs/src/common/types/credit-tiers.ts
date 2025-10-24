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
import type { PackageAllowance } from "../../packages/entities/package-allowance.entity.js";

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
 * Calculate the tier of a package.
 * Now that packages contain multiple allowances, this finds the tier of a specific allowance
 * OR the highest allowance tier if no allowanceId is provided.
 *
 * @param pkg - StudentPackage entity with stripeProductMap.allowances relation loaded
 * @param allowanceId - Optional specific allowance ID to check
 * @returns Numeric tier value
 */
export function getPackageTier(
  pkg: StudentPackage,
  allowanceId?: number,
): number {
  const allowances = pkg.stripeProductMap?.allowances;
  if (!allowances || allowances.length === 0) {
    return 0; // No allowances, no tier
  }

  // If specific allowance requested, return its tier
  if (allowanceId !== undefined) {
    const allowance = allowances.find((a) => a.id === allowanceId);
    if (!allowance) {
      throw new Error(
        `Allowance ${allowanceId} not found in package ${pkg.id}`,
      );
    }
    return getAllowanceTier(allowance);
  }

  // Otherwise return the highest tier allowance
  return Math.max(...allowances.map((a) => getAllowanceTier(a)));
}

/**
 * Determine if a package contains an allowance that can be used to book a session.
 *
 * Rules:
 * - COURSE sessions cannot use package credits (use enrollment instead)
 * - If allowanceId provided, check only that allowance
 * - Otherwise, check if ANY allowance in the package can be used
 * - Service types must match
 * - Allowance tier must be >= session tier
 *
 * @param pkg - StudentPackage entity with stripeProductMap.allowances relation loaded
 * @param session - Session entity with teacher relation loaded
 * @param allowanceId - Optional specific allowance ID to check
 * @returns Object with canUse boolean and the matching allowance (if found)
 */
export function canUsePackageForSession({
  pkg,
  session,
  allowanceId,
}: {
  pkg: StudentPackage;
  session: Session;
  allowanceId?: number;
}): { canUse: boolean; allowance: PackageAllowance | null } {
  // Course sessions require enrollment, not package credits
  if (session.type === ServiceType.COURSE) {
    return { canUse: false, allowance: null };
  }

  const allowances = pkg.stripeProductMap?.allowances;
  if (!allowances || allowances.length === 0) {
    return { canUse: false, allowance: null };
  }

  // If specific allowance requested, check only that one
  if (allowanceId !== undefined) {
    const allowance = allowances.find((a) => a.id === allowanceId);
    if (!allowance) {
      return { canUse: false, allowance: null };
    }
    const canUse = canUseAllowanceForSession(allowance, session);
    return { canUse, allowance: canUse ? allowance : null };
  }

  // Otherwise, find the best matching allowance
  // Prefer same service type with sufficient tier
  const compatibleAllowances = allowances.filter((a) =>
    canUseAllowanceForSession(a, session),
  );

  if (compatibleAllowances.length === 0) {
    return { canUse: false, allowance: null };
  }

  // Return the first compatible allowance (could be enhanced to prefer closest tier match)
  return { canUse: true, allowance: compatibleAllowances[0] };
}

/**
 * Get user-facing display label for a package.
 * For bundle packages with multiple allowances, this returns a generic label.
 * For specific allowance labels, use getAllowanceDisplayLabel().
 *
 * @param pkg - StudentPackage entity with stripeProductMap.allowances relation loaded
 * @param allowanceId - Optional specific allowance ID to get label for
 * @returns User-friendly label string
 */
export function getPackageDisplayLabel(
  pkg: StudentPackage,
  allowanceId?: number,
): string {
  const allowances = pkg.stripeProductMap?.allowances;

  // If no allowances, use package name as fallback
  if (!allowances || allowances.length === 0) {
    return pkg.packageName || "Package Credit";
  }

  // If specific allowance requested, return its label
  if (allowanceId !== undefined) {
    const allowance = allowances.find((a) => a.id === allowanceId);
    if (allowance) {
      return getAllowanceDisplayLabel(allowance);
    }
  }

  // For bundle packages with multiple allowances, return bundle label
  if (allowances.length > 1) {
    return `${pkg.packageName} Bundle`;
  }

  // For single-allowance packages, use the allowance label
  return getAllowanceDisplayLabel(allowances[0]);
}

/**
 * Determine if a booking is "cross-tier" (using higher-tier credit for lower-tier session).
 * This is used to determine if user confirmation is required.
 *
 * @param pkg - StudentPackage entity with stripeProductMap.allowances relation loaded
 * @param session - Session entity with teacher relation loaded
 * @param allowanceId - Optional specific allowance ID to check
 * @returns Object with isCrossTier boolean and the allowance being used (if applicable)
 */
export function isCrossTierBooking(
  pkg: StudentPackage,
  session: Session,
  allowanceId?: number,
): { isCrossTier: boolean; allowance: PackageAllowance | null } {
  const { canUse, allowance } = canUsePackageForSession({
    pkg,
    session,
    allowanceId,
  });

  if (!canUse || !allowance) {
    return { isCrossTier: false, allowance: null };
  }

  const allowanceTier = getAllowanceTier(allowance);
  const sessionTier = getSessionTier(session);

  return {
    isCrossTier: allowanceTier > sessionTier,
    allowance,
  };
}

/**
 * Get a warning message for cross-tier bookings.
 *
 * @param pkg - StudentPackage entity with stripeProductMap.allowances relation loaded
 * @param session - Session entity
 * @param allowanceId - Optional specific allowance ID to check
 * @returns Warning message string or null if not cross-tier
 */
export function getCrossTierWarningMessage(
  pkg: StudentPackage,
  session: Session,
  allowanceId?: number,
): string | null {
  const { isCrossTier, allowance } = isCrossTierBooking(
    pkg,
    session,
    allowanceId,
  );

  if (!isCrossTier || !allowance) {
    return null;
  }

  const allowanceLabel = getAllowanceDisplayLabel(allowance);
  const sessionTypeLabel =
    session.type === ServiceType.PRIVATE ? "private class" : "group class";

  return `This will use a ${allowanceLabel} for a ${sessionTypeLabel}`;
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

// ============================================================================
// ALLOWANCE-LEVEL FUNCTIONS
// ============================================================================

/**
 * Calculate the tier of a specific allowance.
 * Allowance tier = Base service tier + allowance teacher tier
 *
 * @param allowance - PackageAllowance entity
 * @returns Numeric tier value
 */
export function getAllowanceTier(allowance: PackageAllowance): number {
  const baseServiceTier = SERVICE_TYPE_BASE_TIERS[allowance.serviceType] ?? 0;
  const teacherTier = allowance.teacherTier ?? 0;

  return baseServiceTier + teacherTier;
}

/**
 * Determine if a specific allowance can be used to book a session.
 *
 * Rules:
 * - COURSE sessions cannot use package credits (use enrollment instead)
 * - Service types must match
 * - Allowance tier must be >= session tier
 *
 * @param allowance - PackageAllowance entity
 * @param session - Session entity with teacher relation loaded
 * @returns true if allowance can be used for session
 */
export function canUseAllowanceForSession(
  allowance: PackageAllowance,
  session: Session,
): boolean {
  // Course sessions require enrollment, not package credits
  if (session.type === ServiceType.COURSE) {
    return false;
  }

  // Service types must match
  if (allowance.serviceType !== session.type) {
    return false;
  }

  const allowanceTier = getAllowanceTier(allowance);
  const sessionTier = getSessionTier(session);

  // Can use equal or higher tier credit
  return allowanceTier >= sessionTier;
}

/**
 * Get user-facing display label for a specific allowance.
 * Labels are friendly strings like "Private Credit" or "Premium Group Credit".
 *
 * @param allowance - PackageAllowance entity
 * @returns User-friendly label string
 */
export function getAllowanceDisplayLabel(allowance: PackageAllowance): string {
  const isPremium =
    Number.isFinite(allowance.teacherTier) && allowance.teacherTier > 0;

  if (allowance.serviceType === ServiceType.PRIVATE) {
    return isPremium ? "Premium Private Credit" : "Private Credit";
  } else if (allowance.serviceType === ServiceType.GROUP) {
    return isPremium ? "Premium Group Credit" : "Group Credit";
  }

  return "Course Credit";
}

/**
 * Determine if using an allowance for a session is "cross-tier" (using higher-tier credit for lower-tier session).
 * This is used to determine if user confirmation is required.
 *
 * @param allowance - PackageAllowance entity
 * @param session - Session entity with teacher relation loaded
 * @returns true if this is a cross-tier booking requiring confirmation
 */
export function isAllowanceCrossTierBooking(
  allowance: PackageAllowance,
  session: Session,
): boolean {
  if (!canUseAllowanceForSession(allowance, session)) {
    return false; // Not valid at all
  }

  const allowanceTier = getAllowanceTier(allowance);
  const sessionTier = getSessionTier(session);

  return allowanceTier > sessionTier;
}

/**
 * Get a warning message for cross-tier bookings using a specific allowance.
 *
 * @param allowance - PackageAllowance entity
 * @param session - Session entity
 * @returns Warning message string or null if not cross-tier
 */
export function getAllowanceCrossTierWarningMessage(
  allowance: PackageAllowance,
  session: Session,
): string | null {
  if (!isAllowanceCrossTierBooking(allowance, session)) {
    return null;
  }

  const allowanceLabel = getAllowanceDisplayLabel(allowance);
  const sessionTypeLabel =
    session.type === ServiceType.PRIVATE ? "private class" : "group class";

  return `This will use a ${allowanceLabel} for a ${sessionTypeLabel}`;
}
