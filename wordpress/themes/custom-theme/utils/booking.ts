/**
 * Booking URL utilities
 *
 * Generates a booking page URL that can be shared across components.
 * Required params: start (UTC ISO), end (UTC ISO), teacherId
 */

export const DEFAULT_BOOKING_PATH = "/booking-confirmation" as const;

export interface BuildBookingUrlParams {
  startUtc: string; // ISO 8601 UTC, e.g. 2025-09-01T14:00:00Z
  endUtc: string; // ISO 8601 UTC
  teacherId: number | string;
  /**
   * Optional base path for booking page. Defaults to "/book-lesson".
   * You can override via a global (window.thriveBookingBasePath) or by passing here.
   */
  basePath?: string;
}

/**
 * Builds a booking URL like: /book-lesson?start=...&end=...&teacher=...
 */
export function buildBookingUrl(params: BuildBookingUrlParams): string {
  const {
    startUtc,
    endUtc,
    teacherId,
    basePath = (globalThis as any)?.thriveBookingBasePath ||
      DEFAULT_BOOKING_PATH,
  } = params;

  const qp = new URLSearchParams();
  qp.set("start", String(startUtc));
  qp.set("end", String(endUtc));
  qp.set("teacher", String(teacherId));

  // Ensure basePath starts with a slash
  const normalizedBase = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return `${normalizedBase}?${qp.toString()}`;
}
