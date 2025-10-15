import { useCallback, useState } from "@wordpress/element";

type UsePackageBookingState = {
  loading: boolean;
  success: any | null;
  error: string | null;
};

/**
 * Hook to call POST /api/packages/:id/use with { sessionId } or { bookingData }
 * Returns an action and status properties.
 */
export function usePackageBooking() {
  const [state, setState] = useState<UsePackageBookingState>({
    loading: false,
    success: null,
    error: null,
  });

  const bookWithPackage = useCallback(
    async (
      packageId: number | string,
      bookingInfo:
        | number
        | string
        | { teacherId: number; startAt: string; endAt: string }
    ) => {
      setState({ loading: true, success: null, error: null });

      // Determine if we have a sessionId or bookingData
      const body =
        typeof bookingInfo === "object"
          ? { bookingData: bookingInfo }
          : { sessionId: Number(bookingInfo) };

      try {
        const res = await fetch(
          `/api/packages/${encodeURIComponent(String(packageId))}/use`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Request failed: ${res.status}`);
        }

        const data = await res.json().catch(() => null);
        setState({ loading: false, success: data || {}, error: null });
        return { ok: true, data };
      } catch (err: any) {
        const msg = err?.message || "Failed to book with package";
        setState({ loading: false, success: null, error: msg });
        return { ok: false, error: msg };
      }
    },
    []
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
