import { useCallback, useState } from "@wordpress/element";
import { thriveClient } from "../../../../shared/thrive";
import type {
  BookingResponse,
  CreateBookingRequest,
  CreateBookingResponse,
} from "@thrive/shared";

type UsePackageBookingState = {
  loading: boolean;
  success: BookingResponse | CreateBookingResponse | null;
  error: string | null;
};

/**
 * Hook to book sessions with package credits.
 *
 * Two flows:
 * 1. Existing session (sessionId): Uses POST /api/bookings to book an existing group/scheduled session
 * 2. New private session (bookingData): Uses POST /api/packages/:id/use to create a new private session from availability + book it
 *
 * Returns booking action and status.
 */
export function usePackageBooking() {
  const [state, setState] = useState<UsePackageBookingState>({
    loading: false,
    success: null,
    error: null,
  });

  const bookWithPackage = useCallback(
    async (bookingInfo: CreateBookingRequest) => {
      setState({ loading: true, success: null, error: null });

      try {
        const data = await thriveClient.createBooking(bookingInfo);

        if (!data) {
          const msg = "Failed to book with package";
          setState({ loading: false, success: null, error: msg });
          return { ok: false, error: msg };
        }

        setState({ loading: false, success: data, error: null });
        return { ok: true, data };
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to book with package";
        setState({ loading: false, success: null, error: msg });
        return { ok: false, error: msg };
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ loading: false, success: null, error: null });
  }, []);

  return {
    bookWithPackage,
    loading: state.loading,
    success: state.success,
    error: state.error,
    reset,
  } as const;
}

export default usePackageBooking;
