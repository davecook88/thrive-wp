import type { ThriveCalendarContextApi } from "./calendar";
import {
  CalendarContextNotFoundError,
  InvalidCalendarContextError,
} from "./calendar";

/**
 * Gets the Thrive Calendar Context API from a DOM element.
 * This function provides strict typing and validation for accessing the calendar context.
 *
 * @param element - The DOM element to search from (typically a block container)
 * @returns The validated calendar context API
 * @throws {CalendarContextNotFoundError} If no calendar context wrapper is found
 * @throws {InvalidCalendarContextError} If the context API is not properly initialized
 */
export function getCalendarContext(
  element: HTMLElement
): ThriveCalendarContextApi {
  // Find the nearest calendar context wrapper
  const contextElement = element.closest(
    ".wp-block-custom-theme-thrive-calendar-context"
  ) as HTMLElement | null;

  if (!contextElement) {
    throw new CalendarContextNotFoundError(
      `No calendar context wrapper found for element: ${element.tagName}${
        element.id ? `#${element.id}` : ""
      }${element.className ? `.${element.className}` : ""}`
    );
  }

  const contextApi = (contextElement as any).__thriveCalCtxApi;

  if (!contextApi) {
    throw new InvalidCalendarContextError(
      `Calendar context API not found on element with ID: ${contextElement.id}`
    );
  }

  // Validate that the API has the expected methods
  const requiredMethods = [
    "setEventsFromTeacherAvailability",
    "setSelectedTeacherId",
    "ensureRange",
  ];
  const missingMethods = requiredMethods.filter(
    (method) => typeof contextApi[method] !== "function"
  );

  if (missingMethods.length > 0) {
    throw new InvalidCalendarContextError(
      `Calendar context API is missing required methods: ${missingMethods.join(
        ", "
      )}`
    );
  }

  if (typeof contextApi.id !== "string") {
    throw new InvalidCalendarContextError(
      "Calendar context API is missing required id property"
    );
  }

  return contextApi;
}

/**
 * Safely gets the calendar context API, returning null if not found instead of throwing.
 * Use this when the absence of a calendar context is a valid scenario.
 *
 * @param element - The DOM element to search from
 * @returns The calendar context API or null if not found
 */
export function getCalendarContextSafe(
  element: HTMLElement
): ThriveCalendarContextApi | null {
  try {
    return getCalendarContext(element);
  } catch {
    return null;
  }
}
