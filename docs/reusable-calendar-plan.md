# Reusable Calendar Component Plan (WordPress Theme + Admin + NestJS)

This document outlines a framework-agnostic, reusable calendar component to power teacher availability and bookings across:

- WordPress custom theme (Gutenberg block editor + frontend)
- Thrive Admin plugin (Vue islands)
- NestJS backend (data + validation + auth)

The goal is to build it once and ship it in both contexts with consistent UX, data contracts, and access controls.

## Objectives

- Single calendar engine used across admin (full authoring) and theme (booking-focused).
- Strict TypeScript types and clear client-server contracts.
- First-class timezone handling (store UTC, display in user’s local tz).
- Accessibility, keyboard navigation, and screen reader support.
- High performance for weekly/day views and large data ranges.

## Key Constraints (from project guidelines)

- NestJS uses ESM modules, TypeORM + MySQL, UTC datetime, soft-deletes.
- Multi-tenancy ready (future): all APIs allow tenant scoping.
- WordPress renders UI via blocks; server-side gating uses ThriveAuthContext, not `is_user_logged_in()`.
- Single-origin reverse proxy model; session cookie validated upstream (HttpOnly).

## User Roles and Capabilities

- Admin: manage availability for any teacher; drag, resize, create recurring rules; resolve conflicts.
- Teacher: manage own availability; create/edit exceptions and blackout periods.
- Student: view/book allowed slots; join waitlist when full; no drag/resize.

## Views and Interactions

- Views: month (overview), week (primary), day (detailed), list (compact).
- Interactions:
  - Admin/Teacher: create availability (single/recurring), drag to move, resize to adjust, delete; create blackout; create class from slot.
  - Student: select slot from available times, confirm booking, show conflicts or limits inline.
  - All: hover tooltips, keyboard navigation, responsive layout.

## Architecture Overview

1) Core engine (framework-agnostic)
- Package: `@thrive/calendar-core` (TypeScript, ESM)
- Responsibilities:
  - Rendering primitives (virtualized grids, slots, events) without framework dependencies.
  - Utilities: date math, timezone conversions, recurrence expansion, collision detection, snapping, selection.
  - Types: Event, Availability, Blackout, Booking, Selection.
  - Emits DOM CustomEvents for host wrappers.

2) Web Component wrapper (universal)
- Package: `@thrive/calendar-wc` built with Lit (ESM only).
- Shadow DOM encapsulation to avoid CSS bleed (important for Gutenberg and Admin).
- Props via attributes and JS properties; events via CustomEvent.
- This will be the canonical runtime shipped to WordPress theme and Admin.

3) Vue wrapper (Admin convenience)
- Package: `@thrive/calendar-vue` thin adapter around the Web Component for template-friendly props/events.
- Used by Thrive Admin Vue islands.

4) WordPress Gutenberg Block
- Block: `thrive/calendar` with server-rendered PHP (SSR) that outputs the `<thrive-calendar>` web component tag and enqueues assets.
- Attributes for mode, teacher scope, allowed actions, view type, filters; editor-side shows live component.

## Data Model (TypeScript types)

Note: All datetime fields are ISO strings in UTC. DB columns use snake_case; entities map via TypeORM decorators.

```ts
type ISODateTimeUTC = string; // e.g., '2025-09-01T14:00:00Z'

type Role = 'admin' | 'teacher' | 'student';

interface CalendarRange {
  startUtc: ISODateTimeUTC;
  endUtc: ISODateTimeUTC;
  timezone: string; // IANA, client’s zone, e.g., 'America/New_York'
}

interface Availability {
  id: string;
  teacherId: string;
  startUtc: ISODateTimeUTC;
  endUtc: ISODateTimeUTC;
  rrule?: string; // RFC5545 RRULE (weekly, until, byday, etc.)
  exdatesUtc?: ISODateTimeUTC[]; // exceptions
  isActive: boolean;
}

interface Blackout {
  id: string;
  teacherId: string;
  startUtc: ISODateTimeUTC;
  endUtc: ISODateTimeUTC;
  reason?: string;
}

interface ClassSession {
  id: string;
  teacherId: string;
  type: 'one_to_one' | 'group' | 'course';
  startUtc: ISODateTimeUTC;
  endUtc: ISODateTimeUTC;
  capacity?: number; // group only
  enrolledCount?: number; // group only
}

interface Booking {
  id: string;
  studentId: string;
  classId?: string; // for classes
  teacherId: string; // for 1:1 bookings
  startUtc: ISODateTimeUTC;
  endUtc: ISODateTimeUTC;
  status: 'confirmed' | 'cancelled' | 'waitlisted' | 'pending';
}

interface SlotCandidate {
  teacherId: string;
  startUtc: ISODateTimeUTC;
  endUtc: ISODateTimeUTC;
}
```

## Client ↔ Server Contract

Range-based fetching (virtualized):

- GET `/calendar/availability?teacherId=...&start=...&end=...`
- GET `/calendar/classes?teacherId=...&start=...&end=...`
- GET `/calendar/bookings?teacherId=...|studentId=...&start=...&end=...`

Mutations (secured; role-scoped):

- POST `/availability` create single/recurring availability
- PATCH `/availability/:id` adjust or add exceptions
- DELETE `/availability/:id`
- POST `/bookings` create booking from slot candidate (idempotency-key supported)
- PATCH `/bookings/:id` reschedule/cancel
- POST `/waitlist` join waitlist for full class

Headers and auth:

- Cookie: `thrive_sess` (HttpOnly). Nginx introspects → injects `X-Auth-*` headers to WordPress.
- From browser JS in both contexts, requests go to same-origin `/api/...` proxied to NestJS; cookie is sent automatically.
- Include `X-Client-TZ: <IANA zone>` for better server-side logging/validation.

Concurrency and conflicts:

- Use transaction + `SELECT ... FOR UPDATE` on overlapping ranges when creating availability/booking.
- Validate no overlaps with existing bookings/classes/blackouts.
- Support `Idempotency-Key` header to prevent duplicate bookings.

## Timezone and DST

- Store UTC; compute and render in client zone.
- Client provides `timezone` string; server returns UTC; client converts.
- Recurrence expansion in UTC with helpers to avoid DST drift; use RRULE library server-side for canonical expansion; client may preview.

## Events API (Web Component)

Element: `<thrive-calendar>`

Attributes/props:

- `view`: 'week' | 'day' | 'month' | 'list'
- `mode`: 'admin' | 'teacher' | 'student' | 'public'
- `teacher-id`: string | undefined
- `student-id`: string | undefined
- `slot-duration`: number (minutes)
- `snap-to`: number (minutes)
- `timezone`: string (IANA)
- `readonly`: boolean
- `show-classes`: boolean
- `show-availability`: boolean
- `show-bookings`: boolean

Imperative API (via element methods):

- `setRange(range: CalendarRange)`
- `refresh()`
- `focus(dateUtc: ISODateTimeUTC)`

CustomEvents dispatched:

- `slot:select` → `{ startUtc, endUtc, teacherId }`
- `availability:create` → `{ startUtc, endUtc, rrule? }`
- `event:move` → `{ id, kind: 'availability'|'booking'|'class', deltaMinutes }`
- `event:resize` → `{ id, kind, newStartUtc, newEndUtc }`
- `booking:create` → `{ startUtc, endUtc, teacherId }`
- `booking:cancel` → `{ bookingId }`
- `error` → `{ code, message, details? }`

The host app listens and calls the REST API; core only concerns UI and emits intents.

Modal slot for WordPress:
- Provide `<slot name="event-modal"></slot>` and accept a `<template slot="event-modal">` from the Gutenberg block.
- On event click, clone template and perform safe token replacement for placeholders like `{{title}}`, `{{start_local}}`, `{{teacher_name}}`.
- Expose CSS variables and `::part()` hooks for modal styling.

## Performance

- Virtualized week/day columns; only render visible times (windowing).
- Range-batched fetching; debounce range changes; cache recent ranges.
- CSS containment and GPU-accelerated transforms for drag/resize.
- Optional WebWorker for recurrence expansion on large datasets.

## Accessibility and i18n

- ARIA roles: `grid`, `row`, `gridcell`, `toolbar`, `button`.
- Keyboard: arrows to navigate time cells, Enter to select, Esc to cancel drag.
- Screen reader labels for events and slots with datetime in user’s locale.
- Localized date formatting; RTL-aware layout.

## Packaging and Build

- All packages publish ESM only.
- Build with Vite + TS; `@thrive/calendar-wc` outputs a single JS asset and CSS.
- Scoped CSS via Shadow DOM. Provide CSS vars for themeing hooks.
- Version and integrity hashes for WordPress enqueues.
- Serve via Nginx at `/assets/calendar/thrive-calendar.js` (mounted from `web-components/thrive-calendar/dist`). WordPress enqueues this script.

## WordPress Integration (Theme + Block Editor)

Block: `thrive/calendar` (dynamic render)

- `block.json` attributes:
  - `view` (string, enum)
  - `mode` (string)
  - `teacherId` (string)
  - `studentId` (string)
  - `slotDuration` (number)
  - `snapTo` (number)
  - `showClasses`, `showAvailability`, `showBookings` (booleans)

Server render (PHP):

- Output `<thrive-calendar ...>` with attributes from block attrs.
- Enqueue `@thrive/calendar-wc` asset; in dev, load from Vite; in prod, load from built asset with versioning (mirror thrive-admin approach).
- Determine `mode` via `thrive_is_logged_in()` and roles: admin → `admin`, teacher → `teacher`, logged-in student → `student`, else `public`.
- Never read raw cookies in PHP; rely on ThriveAuthContext helpers.

Editor (block editor):

- Load the same WC for a true WYSIWYG experience; provide simplified dataset or live data (respecting headers via same origin).

## Thrive Admin Integration (Vue Islands)

- Create `Calendar.vue` wrapper that renders `<thrive-calendar>` and maps props and events to Vue.
- Hydrate island in `templates/...php` with data attributes for teacher scope and view.
- Use admin AJAX or direct same-origin `/api/...` calls to NestJS; cookie sent automatically.

## NestJS Backend Responsibilities

- Endpoints listed above; all times UTC; query by range; efficient indexes on `(teacher_id, start_utc)` and `(teacher_id, end_utc)`.
- Validation:
  - Overlap checks between availability, bookings, classes, and blackouts.
  - Role-based guards: AdminGuard/TeacherGuard/StudentGuard.
  - Rate limiting for booking endpoints; lockout patterns for abuse.
- Idempotency: accept `Idempotency-Key` and persist mapping table.
- Audit log: who made changes, when, device info.

## DB Sketch (snake_case, singular tables)

- `availability`: id, teacher_id, start_utc, end_utc, rrule, exdates_utc (JSON), is_active, created_at, updated_at, deleted_at
- `blackout`: id, teacher_id, start_utc, end_utc, reason, created_at, updated_at, deleted_at
- `class`: id, teacher_id, type, start_utc, end_utc, capacity, created_at, updated_at, deleted_at
- `booking`: id, student_id, teacher_id, class_id NULL, start_utc, end_utc, status, created_at, updated_at, deleted_at
- `idempotency_key`: key, user_id, created_at, request_hash

TypeORM maps camelCase to snake_case via `{ name: '...' }` per project rules.

## Security

- Server-side permission checks on all mutations.
- Never trust client times; normalize to UTC; validate alignment with configured `snap_to` and `slot_duration` rules.
- CSRF: same-origin cookie + standard protections; WordPress admin AJAX still validates nonces.
- Strict input validation; reject past bookings where policy disallows.

## Testing Strategy

- Unit: date math, recurrence expansion, collision detection, event packing (layout), keyboard navigation.
- Integration: NestJS e2e for endpoints with transactions and overlap checks.
- UI: Playwright smoke tests in both contexts (WP page and Admin page) asserting:
  - Calendar renders week view
  - Selecting a slot emits `slot:select`
  - Drag/resize in admin updates visual and triggers event
  - Booking request returns success and UI refreshes

## Rollout Plan & Milestones

1) Prototype core + WC with read-only week view consuming mock data.
2) Integrate into WP theme via a temporary shortcode or block to validate bundle/headers.
3) Add slot selection + booking POST; implement server overlap checks.
4) Add teacher/admin editing: drag, resize, recurring availability, blackouts.
5) Performance pass (virtualization) and a11y polish.
6) Documentation and examples; stabilize APIs.

## Open Questions

- Should student selection on group classes allocate “holds” before payment? If yes, add a temporary reservation model with TTL.
- Do we need ICS import/export in v1? If not, defer to a future iteration.
- How to expose feature flags (e.g., allow teacher self-override) – proposal: server-side flags via `/config` endpoint and block attributes to toggle UI affordances.

---

This plan favors a single Web Component runtime for maximum reuse. The Vue wrapper is optional sugar for admin islands, while the Gutenberg block simply renders the component and manages assets and auth-aware attributes.
