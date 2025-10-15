/**
 * Booking URL utilities
 *
 * Generates a booking page URL that can be shared across components.
 * Required params: start (UTC ISO), end (UTC ISO), teacherId
 */

export const DEFAULT_BOOKING_PATH = "/booking-confirmation" as const;

export interface BuildBookingUrlParams {
  startUtc?: string; // ISO 8601 UTC, e.g. 2025-09-01T14:00:00Z (optional for group classes with sessionId)
  endUtc?: string; // ISO 8601 UTC (optional for group classes with sessionId)
  teacherId?: number | string; // Optional for group classes with sessionId
  sessionId?: number | string; // For group classes - references an existing session
  packageId?: number | string; // Optional package ID to use for booking
  /**
   * Optional base path for booking page. Defaults to "/book-lesson".
   * You can override via a global (window.thriveBookingBasePath) or by passing here.
   */
  basePath?: string;
  serviceType: "PRIVATE" | "GROUP" | "COURSE";
}

/**
 * Builds a booking URL like: /book-lesson?start=...&end=...&teacher=...
 * For group classes with sessionId: /book-lesson?sessionId=...&serviceType=GROUP
 * Optional packageId can be passed to pre-select a package
 */
export function buildBookingUrl(params: BuildBookingUrlParams): string {
  const {
    startUtc,
    endUtc,
    teacherId,
    sessionId,
    packageId,
    serviceType,
    basePath = (globalThis as any)?.thriveBookingBasePath ||
      DEFAULT_BOOKING_PATH,
  } = params;

  const qp = new URLSearchParams();

  // For group classes with sessionId, only pass sessionId
  if (sessionId && serviceType === "GROUP") {
    qp.set("sessionId", String(sessionId));
    qp.set("serviceType", serviceType);
  } else {
    // For private sessions, require start/end/teacher
    if (!startUtc || !endUtc || !teacherId) {
      throw new Error("startUtc, endUtc, and teacherId are required for non-sessionId bookings");
    }
    qp.set("start", String(startUtc));
    qp.set("end", String(endUtc));
    qp.set("teacher", String(teacherId));
    qp.set("serviceType", serviceType);
  }

  // Add packageId if provided
  if (packageId !== undefined) {
    qp.set("packageId", String(packageId));
  }

  // Ensure basePath starts with a slash
  const normalizedBase = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return `${normalizedBase}?${qp.toString()}`;
}
