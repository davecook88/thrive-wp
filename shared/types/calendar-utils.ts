import type { ThriveCalendarContextApi } from './calendar';

export function getCalendarContextSafe(
  _element: HTMLElement,
): ThriveCalendarContextApi | null {
  // Minimal shim used by shared package. Full implementation lives in theme code.
  return null;
}

export { ThriveCalendarContextApi } from './calendar';
