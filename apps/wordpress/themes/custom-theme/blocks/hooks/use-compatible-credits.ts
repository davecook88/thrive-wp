import { useState, useEffect } from "@wordpress/element";
import { thriveClient } from "../../../../shared/thrive";
import type {
  CompatiblePackage as SharedCompatiblePackage,
  CompatiblePackageWithWarning as SharedCompatiblePackageWithWarning,
  CompatiblePackagesForSessionResponseDto,
} from "@thrive/shared/types/packages";

// Re-export local-friendly type names while using canonical shared types
export type CompatiblePackage = SharedCompatiblePackage;
export type HigherTierPackage = SharedCompatiblePackageWithWarning;

export type CompatibleCreditsResponse = CompatiblePackagesForSessionResponseDto;

export interface UseCompatibleCreditsResult {
  compatible: CompatibleCreditsResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch compatible package credits for a specific session.
 *
 * This hook determines which of the student's package credits can be used
 * to book a session, separated into exact matches (same tier) and higher-tier
 * options (e.g., using a private credit for a group class).
 *
 * @param sessionId - The session ID to check compatibility for
 * @returns Compatible credits data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { compatible, loading, error } = useCompatibleCredits(sessionId);
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * const hasExactMatch = compatible.exactMatch.length > 0;
 * const recommendedPackage = compatible.exactMatch.find(
 *   pkg => pkg.id === compatible.recommended
 * );
 * ```
 */
export function useCompatibleCredits(
  sessionId: number | null,
): UseCompatibleCreditsResult {
  const [compatible, setCompatible] =
    useState<CompatibleCreditsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  useEffect(() => {
    if (!sessionId) {
      setCompatible(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;

    async function fetchCompatibleCredits() {
      setLoading(true);
      setError(null);

      try {
        const data = await thriveClient.fetchCompatiblePackagesForSession(
          sessionId as number,
        );

        if (!data) {
          throw new Error("Failed to fetch compatible credits");
        }

        if (!isCancelled) {
          setCompatible(data);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setCompatible(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchCompatibleCredits();

    return () => {
      isCancelled = true;
    };
  }, [sessionId, fetchTrigger]);

  const refetch = () => {
    setFetchTrigger((prev) => prev + 1);
  };

  return {
    compatible,
    loading,
    error,
    refetch,
  };
}

/**
 * Helper function to check if there are any available credits
 */
export function hasAnyCredits(
  compatible: CompatibleCreditsResponse | null,
): boolean {
  if (!compatible) return false;
  return compatible.exactMatch.length > 0 || compatible.higherTier.length > 0;
}

/**
 * Helper function to get the recommended package from the response
 */
export function getRecommendedPackage(
  compatible: CompatibleCreditsResponse | null,
): CompatiblePackage | HigherTierPackage | null {
  if (!compatible || !compatible.recommended) return null;

  // Check exact match first
  const exactMatch = compatible.exactMatch.find(
    (pkg) => pkg.id === compatible.recommended,
  );
  if (exactMatch) return exactMatch;

  // Then check higher tier
  const higherTier = compatible.higherTier.find(
    (pkg) => pkg.id === compatible.recommended,
  );
  return higherTier || null;
}

/**
 * Helper function to check if a package is cross-tier (requires confirmation)
 */
export function isCrossTier(
  packageId: number,
  compatible: CompatibleCreditsResponse | null,
): boolean {
  if (!compatible) return false;
  return compatible.higherTier.some((pkg) => pkg.id === packageId);
}

/**
 * Helper function to get the warning message for a cross-tier package
 */
export function getCrossTierWarning(
  packageId: number,
  compatible: CompatibleCreditsResponse | null,
): string | null {
  if (!compatible) return null;
  const pkg = compatible.higherTier.find((p) => p.id === packageId);
  return pkg?.warningMessage || null;
}
