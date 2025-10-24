import { PackageAllowance, ServiceType } from "@thrive/shared";

/**
 * Bundle helpers for computing balances and package information.
 * Single source of truth: PackageUse records are authoritative.
 * Balances are computed: remaining = total - SUM(creditsUsed)
 */

/**
 * Compute remaining credits for a specific service type in a package.
 * Requires PackageUse data loaded via query.
 */
export function computeRemainingCredits(
  totalSessions: number,
  packageUses: Array<{ creditsUsed?: number }>,
): number {
  const totalUsed = packageUses.reduce(
    (sum, use) => sum + (use.creditsUsed || 1),
    0,
  );
  return Math.max(0, totalSessions - totalUsed);
}

/**
 * Compute remaining credits for a specific service type.
 * Filters PackageUse by serviceType before aggregating.
 */
export function computeRemainingCreditsByServiceType(
  totalSessions: number,
  packageUses: Array<{
    serviceType?: ServiceType | null;
    creditsUsed?: number;
  }>,
  serviceType: ServiceType,
): number {
  const totalUsed = packageUses
    .filter((use) => use.serviceType === serviceType)
    .reduce((sum, use) => sum + (use.creditsUsed || 1), 0);
  return Math.max(0, totalSessions - totalUsed);
}

/**
 * Compute remaining credits for a specific allowance.
 * Filters PackageUse by allowanceId before aggregating.
 * This is the most precise method since it tracks exactly which allowance was used.
 */
export function computeRemainingCreditsForAllowance(
  allowance: PackageAllowance & { id: number },
  packageUses: Array<{
    allowanceId?: number | null;
    creditsUsed?: number;
  }>,
): number {
  console.log("Computing remaining for allowance:", allowance, packageUses);
  const totalUsed = packageUses
    .filter((use) => use.allowanceId === allowance.id)
    .reduce((sum, use) => sum + (use.creditsUsed || 1), 0);

  console.log("Total used credits for allowance:", totalUsed);
  return Math.max(0, allowance.credits - totalUsed);
}

/**
 * Generate auto description for a bundle package.
 * Example: "5 Private (30min) + 3 Group (60min) + 2 Course"
 */
export function generateBundleDescription(
  allowances: PackageAllowance[],
): string {
  const parts = allowances.map((allowance) => {
    const serviceLabel = String(allowance.serviceType).toLowerCase();
    const isCourse =
      String(allowance.serviceType) === String(ServiceType.COURSE);
    if (isCourse) {
      return `${allowance.credits} ${serviceLabel}`;
    }
    return `${allowance.credits} ${serviceLabel} (${allowance.creditUnitMinutes}min)`;
  });
  return parts.join(" + ");
}

/**
 * Find an allowance matching a session's service type.
 */
export function findAllowanceForServiceType(
  allowances: PackageAllowance[],
  serviceType: ServiceType,
): PackageAllowance | undefined {
  return allowances.find((a) => a.serviceType === serviceType);
}

/**
 * Check if a package bundle contains a specific service type.
 */
export function bundleContainsServiceType(
  allowances: PackageAllowance[],
  serviceType: ServiceType,
): boolean {
  return allowances.some((a) => a.serviceType === serviceType);
}

/**
 * Get total credits available in a bundle across all types.
 */
export function getTotalBundleCredits(allowances: PackageAllowance[]): number {
  return allowances.reduce((sum, a) => sum + a.credits, 0);
}

/**
 * Validate that an allowance array is valid for a bundle.
 */
export function validateAllowances(allowances: PackageAllowance[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!allowances || allowances.length === 0) {
    errors.push("At least one allowance is required");
  }

  for (let i = 0; i < allowances.length; i++) {
    const a = allowances[i];

    if (!a.serviceType) {
      errors.push(`Allowance ${i}: serviceType is required`);
    }

    if (!a.credits || a.credits <= 0) {
      errors.push(`Allowance ${i}: credits must be positive`);
    }

    if (![15, 30, 45, 60].includes(a.creditUnitMinutes)) {
      errors.push(
        `Allowance ${i}: creditUnitMinutes must be 15, 30, 45, or 60`,
      );
    }

    if (a.teacherTier !== undefined && a.teacherTier < 0) {
      errors.push(`Allowance ${i}: teacherTier cannot be negative`);
    }
  }

  // Check for duplicate service types
  const serviceTypes = allowances.map((a) => a.serviceType);
  const uniqueTypes = new Set(serviceTypes);
  if (uniqueTypes.size !== serviceTypes.length) {
    errors.push("Each service type can only appear once in a bundle");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
