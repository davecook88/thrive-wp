# Teachers Area Roadmap and Availability Calendar (Phase 1)

Date: 2025-08-31

## Goals

- Create a teachers area with multiple routes under a single origin: `/teacher` and `/teacher/*`.
- Ship the first feature: Availabili- API:
  - GET/PUT/preview endpoints work and are role-protected.
  - All times stored/returned as UTC with correct conversions for preview.
  - Unit + E2E tests passing.alendar where teachers set recurring rules and exceptions at `/teacher/set-availability`.
- Align with our hybrid architecture: WordPress (blocks/editor-first) + NestJS API behind Nginx with reverse-proxy auth headers.

## Scope (Phase 1)

1) Routing & Pages
- Public routes (server-rendered via WordPress):
  - `/teacher` – teacher home (simple welcome + links)
  - `/teacher/set-availability` – availability management UI

2) Availability Management (MVP)
- Weekly recurring rules by weekday and time windows
- Optional date-specific exceptions and blackout periods
- Timezone-aware editing; store all times in UTC
- Server-side preview: expand rules to concrete availability slots for a date range

3) AuthZ
- Only users with the `teacher` role can access the settings UI and API
- Non-teachers see a gentle “not authorized” message

Out of scope (Phase 1): Google Calendar sync, student bookings, pricing/tier logic beyond read-only display, complex recurrence (RRULE), holidays import.

---

## Architecture Alignment

- WordPress: Editor-first, block-driven UI (per `wordpress.instructions.md`).
  - Implement a custom block for teacher availability with server-side render mapping attributes to frontend output.
  - Gate in PHP using `thrive_is_logged_in()` and `thrive_is_teacher()`; never rely on `is_user_logged_in()`.
- NestJS API: ESM + TypeORM. All DB columns snake_case, UTC datetimes. Use guards to enforce role `teacher`.
- Nginx: No config changes needed. All API under `/api/` is already proxied to NestJS; auth headers injected via `/auth/introspect`.
- Auth: Rely on reverse-proxy injected `X-Auth-*` headers and provided helpers in WordPress.

---

## User Flows (Phase 1)

1) Visit `/teacher`
- If logged in as teacher: show welcome with links: “Set Availability” → `/teacher/set-availability`.
- If logged in but not teacher: show “Teacher access required”.
- If anonymous: show login CTA to `/auth/google`.

2) Visit `/teacher/set-availability`
- Server-rendered page with Teacher Availability block.
- UI allows adding weekday rules (e.g., Mon 09:00–12:00, 13:00–17:00) and optional date-specific exceptions/blackouts.
- Save button persists via `/api/teachers/me/availability` endpoints.
- Preview calendar shows the next 2–4 weeks of slots expanded from rules.

---

## Data Model (MVP)

## Data Model (MVP)

Tables (TypeORM migrations; snake_case, UTC datetime):

- `teacher_availability` (existing table, adapted for MVP)
  - Uses `kind` enum: `RECURRING`, `BLACKOUT`
  - `RECURRING`: weekday + start/end minutes from midnight UTC
  - `BLACKOUT`: start/end datetime ranges for exceptions
  - All times stored and returned as UTC

Notes
- Simplified to UTC-only for MVP (no timezone conversions)
- Recurring rules stored as minutes from midnight UTC
- Preview expands rules to concrete UTC datetime slots
- Client handles any timezone display conversions

---

## API Design (NestJS)

Base: `/api/teachers/me/availability` (auth required; `teacher` role)

- GET `/api/teachers/me/availability`
  - Returns: `{ rules: AvailabilityRule[], exceptions: AvailabilityException[] }`

- PUT `/api/teachers/me/availability`
  - Body: `{ rules: AvailabilityRuleInput[], exceptions?: AvailabilityExceptionInput[] }`
  - Upserts entire set for the teacher in a transaction (replace-all semantics for simplicity in MVP).

- POST `/api/teachers/me/availability/preview`
  - Body: `{ start: string; end: string }`
  - Returns expanded windows: `{ windows: Array<{ start: string; end: string }> }` (ISO8601 UTC)

Types
```
type Weekday = 0|1|2|3|4|5|6; // 0=Sun

interface AvailabilityRule {
  id: number;
  weekday: Weekday;
  startTime: string; // 'HH:mm' (UTC)
  endTime: string;   // 'HH:mm' (UTC)
}

interface AvailabilityRuleInput {
  weekday: Weekday;
  startTime: string; // 'HH:mm' (UTC)
  endTime: string;   // 'HH:mm' (UTC)
}

interface AvailabilityException {
  id: number;
  date: string;      // 'YYYY-MM-DD' (UTC)
  startTime?: string; // 'HH:mm' (UTC)
  endTime?: string;   // 'HH:mm' (UTC)
  isBlackout: boolean;
}

interface AvailabilityExceptionInput {
  date: string;
  startTime?: string;
  endTime?: string;
  isBlackout?: boolean; // default false
}
```

Validation & Errors
- 400 on overlaps inside a single weekday for the teacher when saving.
- 400 if `startTime >= endTime`.
- 400 if `preview` range > 90 days.
- 401 if not authenticated; 403 if not a teacher.

Guards
- Implement `TeacherGuard` similar to existing `AdminGuard` to enforce role.

---

## WordPress Frontend (Theme Block)

Block: `thrive/teacher-availability` (editor-first)

- Attributes (examples):
  - `heading` (string)
  - `helpText` (string)
  - `accentColor` (string)
  - `showPreviewWeeks` (number, default 2)

Render (PHP)
- Gate with `thrive_is_teacher()`. If not logged in → login CTA to `/auth/google`. If logged in non-teacher → “Teacher access required”.
- Map style attributes (colors, align) to frontend.
- Server renders container and minimal state; interactive UI is hydrated on client.

Client UI
- Use/reuse `web-components/thrive-calendar` for calendar visualization.
- Add a lightweight controller (vanilla TS or small React/Vue island) to manage:
  - Fetch rules/exceptions via `/api/teachers/me/availability`
  - Edit form for weekday windows
  - Add/remove exceptions/blackouts
  - Preview via `/api/teachers/me/availability/preview`
  - Persist via PUT
- No need to read cookies; browser sends `thrive_sess` automatically. Handle 401/403 gracefully.

Pages
- Create WordPress pages (can be seeded) with slugs:
  - `teacher` → simple template (links to set-availability)
  - `teacher/set-availability` → contains Teacher Availability block

Security
- All sensitive branching in PHP using helpers from `wordpress.instructions.md`.

---

## Nginx & Infra

- No changes required. `/api/` is already proxied.
- Ensure `/auth/introspect` injects `X-Auth-*`; WordPress consumes via helpers.

---

## Tasks Breakdown (Assignable Units)

1) NestJS: Entities, Migrations, Service, Controller, Guard ✅
- ✅ Created `TeacherGuard` (similar to `AdminGuard`)
- ✅ Created `TeachersService` with UTC-only logic (no luxon)
- ✅ Created `TeachersController` with GET/PUT/POST endpoints
- ✅ Created `TeachersModule` and added to `AppModule`
- ✅ Adapted existing `teacher_availability` entity
- ✅ Unit tests for service (happy path + overlap + timezone edge cases)

2) WordPress Theme: Block + Pages ✅
- ✅ Created `custom-theme/teacher-availability` block with editor interface
- ✅ Implemented PHP render with auth checks (`thrive_is_teacher()`)
- ✅ Added interactive JavaScript for availability management
- ✅ Created page creation script (`create-teacher-pages.php`)
- ✅ Registered block in build system
- ✅ PHPStan passes; no use of `is_user_logged_in()` for gating

3) Frontend UI (Islands/Web Component Integration)
- Extend/compose `web-components/thrive-calendar` to display availability preview windows.
- Add editor form for weekday rules and exceptions; validate times client-side.
- Wire fetch/PUT/preview calls; show toast/errors.
- Handle 401/403 states (login/unauthorized messages).

4) Nginx/Infra
- No action expected. Add sanity checks to docs; ensure config still passes `nginx -t`.

5) Documentation & Demos
- Add a short README for the block usage and endpoints.
- Animated GIF or screenshots for authoring flow.

---

## Acceptance Criteria

- Visiting `/teacher`:
  - Teacher sees welcome and link to Set Availability.
  - Non-teacher sees access message. Anonymous sees login CTA.

- Visiting `/teacher/set-availability` as a teacher:
  - Page renders block with form and preview calendar.
  - Can add weekday windows, save, refresh, and see persisted rules.
  - Can add a date-specific blackout; preview removes windows accordingly.
  - Saving invalid overlaps yields clear inline errors (no server 500s).

- API:
  - GET/PUT/preview endpoints work and are role-protected.
  - All times stored/returned in UTC with correct conversions for preview.
  - Unit + E2E tests passing.

- Quality Gates:
  - Build: PASS (NestJS compiles ESM; PHP has no syntax errors).
  - Lint/Typecheck: PASS (TS strict; PHPStan clean for new files).
  - Tests: PASS (service + e2e minimal set).

---

## Edge Cases to Consider

- Daylight saving transitions (missing/duplicate hour) when converting between local tz and UTC.
- Overlapping windows across midnight (e.g., 22:00–02:00) – Phase 1: either forbid or split into two windows.
- Large preview windows (cap to 90 days).
- Teacher with no rules (preview empty).
- Exceptions without times (full-day blackout).

---

## Implementation Notes

- **UTC-Only Approach**: All times stored and returned as UTC. No timezone conversions on server.
- **Recurring Rules**: Stored as minutes from midnight UTC (0-1439)
- **Preview Logic**: Expands rules to concrete UTC datetime slots using native Date
- **Client Responsibility**: Any timezone display conversions handled by frontend
- **Existing Schema**: Adapts existing `teacher_availability` table with `kind` enum

---

## Deliverables per Track

NestJS
- Entities + migration files
- Controller, DTOs (class-validator), Service
- `TeacherGuard`
- Tests: unit + e2e

WordPress
- `thrive/teacher-availability` block (JS + PHP render)
- Pages created and populated
- Minimal docs under `wordpress/themes/custom-theme/README.md`

Frontend
- Calendar preview wired
- Forms for rules and exceptions
- Error/empty states

Docs
- This plan + API/Block README updates

---

## Milestones & Estimates (Rough)

1) API foundation (entities, guard, endpoints, tests): 1.5–2 days
2) WP block + pages scaffold (server render + gating): 0.5–1 day
3) UI wiring + preview + validation: 1–1.5 days
4) Polish, docs, QA: 0.5 day

---

## Testing the Teacher Portal

### Setup Steps
1. **Start the services**: Run `make run` to start Docker containers
2. **Create teacher pages**: Run the page creation script:
   ```bash
   docker-compose exec wordpress php /var/www/html/wp-content/themes/custom-theme/create-teacher-pages.php
   ```
3. **Create a teacher user**: In the database, ensure there's a user with teacher role:
   ```sql
   -- Check existing users
   SELECT u.id, u.email, t.id as teacher_id 
   FROM user u 
   LEFT JOIN teacher t ON u.id = t.user_id 
   WHERE t.id IS NOT NULL;
   ```
4. **Login as teacher**: Visit `http://localhost:8080/api/auth/google` and authenticate

### Test Scenarios
1. **Visit teacher home**: `http://localhost:8080/teacher`
   - Should show welcome message and link to set availability
   - Non-teachers should see access denied

2. **Visit availability page**: `http://localhost:8080/teacher/set-availability`
   - Should show the availability management interface
   - Test adding rules and exceptions
   - Test preview functionality

3. **API Testing**:
   ```bash
   # Get availability
   curl -H "Cookie: thrive_sess=YOUR_SESSION_COOKIE" http://localhost:3000/api/teachers/me/availability
   
   # Preview availability
   curl -X POST -H "Cookie: thrive_sess=YOUR_SESSION_COOKIE" \
        -H "Content-Type: application/json" \
        -d '{"start":"2024-01-01","end":"2024-01-15"}' \
        http://localhost:3000/api/teachers/me/availability/preview
   ```

### Current Limitations
- UI is functional but basic (uses browser prompts for input)
- No timezone handling (all UTC)
- Preview shows next 2 weeks by default
- Save functionality displays success message but doesn't actually persist yet
