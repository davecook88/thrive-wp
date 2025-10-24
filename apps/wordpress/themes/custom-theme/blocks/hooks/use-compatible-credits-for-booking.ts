import { useState, useEffect } from "@wordpress/element";
import { thriveClient } from "../../../../shared/thrive";
import { ServiceType } from "@thrive/shared";
import type { CompatiblePackagesForSessionResponseDto } from "@thrive/shared/types/packages";

export interface UseCompatibleCreditsForBookingResult {
  compatible: CompatiblePackagesForSessionResponseDto | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch compatible package credits for a booking based on service type and teacher tier.
 *
 * This hook determines which of the student's package credits can be used
 * to book a new session (e.g., private session from availability), separated into exact matches
 * (same tier) and higher-tier options (e.g., using a premium credit for a standard teacher).
 *
 * Unlike useCompatibleCredits which requires an existing sessionId, this hook works with
 * booking parameters to support private session creation from availability slots.
 *
 * @param serviceType - The service type for the booking (PRIVATE, GROUP, etc.)
 * @param teacherTier - The teacher tier (from PublicTeacherDto)
 * @returns Compatible credits data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { compatible, loading, error } = useCompatibleCreditsForBooking(
 *   ServiceType.PRIVATE,
 *   selectedTeacher.tier
 * );
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
export function useCompatibleCreditsForBooking(
  serviceType: ServiceType | null,
  teacherTier: number | null,
): UseCompatibleCreditsForBookingResult {
  const [compatible, setCompatible] =
    useState<CompatiblePackagesForSessionResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  useEffect(() => {
    if (!serviceType || teacherTier === null) {
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
        const data = await thriveClient.fetchCompatiblePackagesForBooking(
          serviceType,
          teacherTier,
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
  }, [serviceType, teacherTier, fetchTrigger]);

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
  compatible: CompatiblePackagesForSessionResponseDto | null,
): boolean {
  if (!compatible) return false;
  return compatible.exactMatch.length > 0 || compatible.higherTier.length > 0;
}
