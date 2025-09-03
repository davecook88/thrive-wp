# Thrive Calendar Context Runtime

This document explains the calendar context architecture used in the WordPress theme. It scopes calendar state and APIs to a specific wrapper block so that all calendar behavior is local to that instance and safe to compose.

## Files and Roles
- Wrapper block runtime: `wordpress/themes/custom-theme/blocks/thrive-calendar-context/view.ts`
- Calendar (Web Component): `web-components/thrive-calendar/src/thrive-calendar.ts` (+ toolbar/week-view)
- Teacher Availability UI: `wordpress/themes/custom-theme/blocks/teacher-availability/components/TeacherAvailability.tsx` and `view.tsx`
- Event Modal mapping runtime: `wordpress/themes/custom-theme/blocks/selected-event-modal/view.tsx`

## Composition
Place blocks in this order inside a single `Thrive Calendar Context` wrapper:

1. `custom-theme/teacher-availability` (optional UI for teachers)
2. `custom-theme/thrive-calendar` (the visual calendar)
3. `custom-theme/selected-event-modal` (opens a modal when events are clicked)

Example page markup (simplified):
```
<!-- wp:custom-theme/thrive-calendar-context {"selectedTeacherId":"me"} -->
<!-- wp:custom-theme/teacher-availability /-->
<!-- wp:custom-theme/thrive-calendar {"showClasses":true} /-->
<!-- wp:custom-theme/selected-event-modal /-->
<!-- /wp:custom-theme/thrive-calendar-context -->
```

The wrapper emits a data attribute `data-selected-teacher` (from `selectedTeacherId`) for context-aware behavior.

## Context Runtime (scoped)
The context logic lives in `thrive-calendar-context/view.ts` and automatically runs on DOM ready. It:

- Creates a per-wrapper context with:
  - `events` (merged from sources)
  - `sources` (per-source cache of events and fetched ranges)
  - `pending` (in-flight fetch keys)
  - `selectedTeacherId`, `view`, `anchor`
- Preloads the current week’s teacher availability on attach
- Wires descendants `thrive-calendar` to:
  - Push events into the calendar when cache changes
  - Listen to navigation (`today`, `navigate`, `set-view`) and fetch new ranges
  - Relay `event:click` as a document event `thrive-calendar:selectedEvent` with `contextId`

## Child API (scoped, no globals)
Children can access a context-local API through a DOM property on the wrapper element:

Property: `__thriveCalCtxApi` (object)

Methods:
- `setEventsFromTeacherAvailability(startIso: string, endIso: string, events: CalendarEvent[]): void`
  - Replaces the given [start, end] range for the `teacher-availability` source and refreshes calendars.
- `ensureRange(start: Date, end: Date): Promise<void>`
  - Ensures the availability preview for the given range is fetched and cached.
- Getter `id: string` – the wrapper element ID.

Attaching for children:
- The wrapper exposes the property directly on the wrapper element. The `teacher-availability` block also copies this API reference onto its root container (`#teacher-availability-root`) as `__thriveCalCtxApi` for convenience.

## Events from the Calendar (WC)
The `thrive-calendar` web component emits these events (bubbles):
- `event:click` – detail: `{ event }`
- `today` – no detail
- `navigate` – detail: `{ direction: 'prev' | 'next' }`
- `set-view` – detail: `{ view: 'week' | 'day' | 'month' | 'list' }`

The context listens and reacts to these.

## Availability Preview Fetch
Endpoint: `POST /api/teachers/me/availability/preview`
Body: `{ start: ISODateTime, end: ISODateTime }`
Returns: `{ windows: Array<{ start: ISO, end: ISO }> }`

The context converts windows to `availability` events and caches them per week range. Teacher ID is attached if `selectedTeacherId` is present on the wrapper.

## Event Shape
The calendar uses a discriminated union typed as `CalendarEvent` (see `web-components/thrive-calendar/src/types.ts`). The minimal shape used here is:
```
{
  id: string,
  title: string,
  startUtc: string,
  endUtc: string,
  type: 'availability' | 'class' | 'booking' | 'blackout',
  teacherId?: string
}
```

## Caching & Merge Strategy
- Per-source cache: `{ events: CalEvent[], ranges: Set<string> }`
- Range key: `"<startIso>__<endIso>"`
- When setting a range, existing events fully within [start,end] for that source are removed and replaced.
- All sources are merged and sorted by `startUtc` before pushing to calendars.

Note: Partial overlaps are not normalized (future improvement).

## Teacher Availability UI Integration
- After load/refresh/save, the UI posts preview to the API and calls:
  `api.setEventsFromTeacherAvailability(startIso, endIso, events)`
- The UI obtains the scoped API via the nearest wrapper. In `view.tsx`:
  - The container `#teacher-availability-root` copies the wrapper’s `__thriveCalCtxApi` onto itself for easy access.

## Selected Event Modal
- Listens for `thrive-calendar:selectedEvent` and picks the modal wrapper within the same context.
- Fetches modal CPT content and interpolates placeholders from the event.

## Troubleshooting
- No preview requests:
  - Ensure the page uses `Thrive Calendar Context` wrapper and bundles are built.
  - Check `data-selected-teacher` is present when needed (set via block attributes).
  - Confirm `thrive-calendar-context/view.ts` is included in the build (`view.index.ts`).
- Event clicks don’t open a modal:
  - Ensure `custom-theme/selected-event-modal` is inside the same context wrapper as the calendar.

## Test Flow
1. Load `/teacher-availability/` with the wrapper containing the calendar and modal blocks.
2. Network: See `POST /api/teachers/me/availability/preview` on load.
3. Click calendar navigate arrows – new week preview requests should appear.
4. Clicking an event should open the modal.

## Security Notes
- All API calls are same-origin and rely on session cookie forwarding; no tokens in JS.
- Teacher preview endpoints are protected; expect 401/403 if not a teacher.

## Future Enhancements
- Add sources for classes and bookings with the same caching interface.
- Prefetch adjacent weeks on idle.
- Normalize partially overlapping events and deduplicate across sources.
