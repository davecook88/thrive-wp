# API Types Consolidation — TODO

Goal: centralize all API payload and return types in `shared/types/` so both WordPress and NestJS use a single source of truth for request/response shapes.

Why: reduce duplicate definitions, prevent drift, and enable stronger compile-time guarantees across the full-stack app.

High-level plan

- Inventory current DTOs and type usages in `nestjs/`, `wordpress/`, and `web-components/`.
- Design `shared/types` layout and conventions (TS-only types, Zod schemas for runtime validation, naming rules).
- Implement core shared types and minimal Zod schemas.
- Make shared package consumable by both NestJS and WordPress code (TS path mapping, builds).
- Migrate NestJS DTOs and front-end uses incrementally, running tests at each step.

Acceptance criteria

- `shared/types` contains canonical TypeScript definitions for every API request and response used by NestJS controllers.
- NestJS controllers import types from `shared/types` for compile-time checks; runtime validation behavior is preserved (Zod integration remains or is adapted).
- Frontend TypeScript code imports types from `shared/types` and builds without additional changes.
- A migration guide exists documenting where to replace existing DTOs and common gotchas.

Rollout strategy

1. Create `shared/types` skeleton and export map.
2. Add critical enums & types (User, Student, Teacher, Booking, ServiceType, PaymentIntent).
3. Replace NestJS DTOs for non-critical endpoints and run tests.
4. Continue incremental migration until NestJS imports all shared types.
5. Update front-end and WordPress TypeScript projects to consume shared types.
6. Clean up duplicated DTO files and add deprecation notes.

Initial tasks

- Inventory NestJS DTOs (create `docs/nestjs-dtos.md`).
- Inventory frontend/WordPress types (create `docs/wp-types.md`).
- Create `shared/types/README.md` with conventions and usage examples.
- Add `docs/api-types-todo.md` (this file).

Notes and assumptions

- We'll prefer TypeScript types + Zod runtime schemas where runtime validation is currently used in NestJS. For pure front-end display-only types, typings-only definitions may suffice.
- PHP (WordPress) cannot directly import TS types; for PHP-only code we'll generate JSON Schemas or documentation for manual syncing, or keep TypeScript as the source of truth for front-end and JS plugins.
- We'll update the project's `tsconfig.json` `paths` to make imports ergonomic (e.g., `shared/types/*`).

# API Endpoints Inventory (NestJS)

Purpose: enumerates every NestJS HTTP endpoint (method + path) with the source file, DTO/Zod schema used, guards, and notes. Use this as a checklist for migrating payload/return types into `shared/types/` and updating backend and client code.

Format per entry:
- Method PATH
  - File: `nestjs/src/...`
  - DTOs / Schemas: input DTOs or Zod schemas (if any)
  - Response types: noted when obvious
  - Guards: Auth guards applied
  - Notes: any special behavior or headers used (e.g., X-Auth-* headers)

---

- GET /
  - File: `nestjs/src/app.controller.ts`
  - DTOs / Schemas: none
  - Response: string
  - Guards: none
  - Notes: root health check

- POST /test-bridge
  - File: `nestjs/src/app.controller.ts`
  - DTOs / Schemas: none (body logged as Record<string, unknown>)
  - Response: { message: string }
  - Guards: none

- AUTH endpoints (File: `nestjs/src/auth/auth.controller.ts`)

- GET /auth/google
  - File: `auth.controller.ts`
  - DTOs: none (Passport guard)
  - Guards: AuthGuard('google')

- GET /auth/google/start
  - File: `auth.controller.ts`
  - DTOs: query param `redirect` (string)
  - Guards: none (starts OAuth)

- GET /auth/google/callback
  - File: `auth.controller.ts`
  - DTOs: handled by Passport; response sets cookies and redirects
  - Guards: AuthGuard('google')

- GET /auth/introspect
  - File: `auth.controller.ts`
  - DTOs: none
  - Response: 204 (sets X-Auth-* headers)
  - Notes: used by Nginx to inject auth headers to WordPress

- POST /auth/refresh
  - File: `auth.controller.ts`
  - DTOs: none
  - Response: 204, sets new cookies

- POST /auth/register
  - File: `auth.controller.ts`
  - DTOs: Body fields: email, password, firstName, lastName, redirect
  - Response: { ok: true, redirect: string }

- POST /auth/login
  - File: `auth.controller.ts`
  - DTOs: Body fields: email, password, redirect
  - Response: { ok: true, redirect: string }

- GET /auth/logout
  - File: `auth.controller.ts`
  - DTOs: none
  - Response: redirects to WP

---

- USERS (File: `nestjs/src/users/users.controller.ts`)

- GET /users
  - File: `users.controller.ts`
  - Query: page, limit, search, role
  - Response: `PaginatedUsersResponseDto` (see `nestjs/src/users/dto`)
  - Guards: `AdminGuard`

- POST /users/make-admin
  - File: `users.controller.ts`
  - DTO: `MakeAdminSchema` / `MakeAdminDto` (Zod validation)
  - Guards: `AdminGuard`

- POST /users/make-teacher
  - File: `users.controller.ts`
  - DTO: `MakeTeacherSchema` / `MakeTeacherDto` (Zod validation)
  - Guards: `AdminGuard`

---

- STUDENTS (File: `nestjs/src/students/students.controller.ts`)

- GET /students
  - File: `students.controller.ts`
  - Response: `Student[]` (entity)

- GET /students/:id
  - File: `students.controller.ts`
  - Response: `Student | null`

- GET /students/user/:userId
  - File: `students.controller.ts`
  - Response: `Student | null`

- GET /students/me/sessions
  - File: `students.controller.ts`
  - Query: start, end
  - Guards: `StudentGuard`
  - Response: student sessions (shape in service)

- GET /students/me/stats
  - File: `students.controller.ts`
  - Guards: `StudentGuard`
  - Response: student stats

- GET /students/me/upcoming
  - File: `students.controller.ts`
  - Query: limit
  - Guards: `StudentGuard`
  - Response: upcoming sessions list

- GET /students/me/enrollments
  - File: `students.controller.ts`
  - Guards: `StudentGuard`
  - Response: enrollment list

---

- BOOKINGS (File: `nestjs/src/bookings/bookings.controller.ts`)

- GET /bookings/student/:studentId
  - File: `bookings.controller.ts`
  - Guards: none (but checks X-Auth headers)
  - Notes: validates `x-auth-user-id` header matches studentId
  - Response: list of bookings

- GET /bookings/:id/can-modify
  - File: `bookings.controller.ts`
  - Checks `x-auth-user-id` header present
  - Response: boolean or permissions object

- POST /bookings/:id/cancel
  - File: `bookings.controller.ts`
  - DTO: `CancelBookingSchema` / `CancelBookingDto` (schema in bookings.service.js)
  - Validation: `ZodValidationPipe`
  - Checks `x-auth-user-id` header
  - Response: booking cancellation result

---

- TEACHERS (various controllers)

- GET /teachers
  - File: `teachers/teachers.public.controller.ts`
  - Response: list of `PublicTeacherDto`
  - Response shape (TypeScript):
    ```ts
    export type PublicTeacherDto = {
      id: number;
      userId: number;
      displayName: string;
      bio?: string | null;
      avatarUrl?: string | null;
      languages?: string[];
      levels?: number[]; // level ids
      specialties?: string[];
      rating?: number; // average rating 0-5
      isActive: boolean;
    }
    ```
  - Zod schema name: `PublicTeacherSchema`
  - Notes: used by public listings and search. Keep fields minimal for public consumption.

- GET /teachers/:id
  - File: `teachers/teachers.public.controller.ts`
  - Response: `PublicTeacherDto` or 404 when not found
  - Additional detailed response for authenticated callers: `TeacherDetailDto` (includes contact, availability summary, pricing keys)
  - TeacherDetailDto (TS):
    ```ts
    export type TeacherDetailDto = PublicTeacherDto & {
      contactEmail?: string | null; // only for teachers and admins
      profileComplete: boolean;
      availabilitySummary?: {
        nextAvailable?: string | null; // ISO datetime
        zonesCovered?: string[];
      } | null;
      pricing?: Record<string, unknown> | null; // keep opaque; migrate to typed price objects later
    }
    ```
  - Zod schema names: `PublicTeacherSchema`, `TeacherDetailSchema`

- POST /teachers/availability/preview
  - File: `teachers/teachers.public.controller.ts`
  - DTO: `PreviewAvailabilityDto`
    - DTO (TS/Zod):
      ```ts
      export const PreviewAvailabilitySchema = z.object({
        teacherId: z.number().int().positive(),
        start: z.string().datetime(),
        end: z.string().datetime(),
        timezone: z.string().optional(),
        serviceType: z.nativeEnum(ServiceType),
      });
      export type PreviewAvailabilityDto = z.infer<typeof PreviewAvailabilitySchema>;
      ```
  - Response: `PreviewAvailabilityResponse`
    - Response (TS):
      ```ts
      export type AvailabilityWindow = { start: string; end: string; available: boolean; reason?: string };
      export type PreviewAvailabilityResponse = { windows: AvailabilityWindow[] };
      ```
  - Notes: used by front-end to show candidate booking times without authentication.

- GET /teachers/me/availability
  - File: `teachers/teachers.controller.ts`
  - Guards: `TeacherGuard`
  - Response: availability rules & exceptions (`GetAvailabilityResponse`)
  - GetAvailabilityResponse (TS):
    ```ts
    export type WeeklyAvailabilityRule = {
      id: number;
      dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
      startTime: string; // HH:MM (local)
      endTime: string; // HH:MM (local)
      maxBookings?: number | null;
    }

    export type AvailabilityException = {
      id: number;
      date: string; // YYYY-MM-DD
      start?: string | null; // ISO datetime optional (for single-block exceptions)
      end?: string | null;
      isAvailable: boolean; // true = available override, false = blocked
      note?: string | null;
    }

    export type GetAvailabilityResponse = {
      timezone: string;
      rules: WeeklyAvailabilityRule[];
      exceptions: AvailabilityException[];
    }
    ```
  - Zod schema names: `GetAvailabilityResponseSchema`, `WeeklyAvailabilityRuleSchema`, `AvailabilityExceptionSchema`
  - Notes: Response should be the canonical shape used by the teacher availability UI. Keep timezone explicit.

- PUT /teachers/me/availability
  - File: `teachers/teachers.controller.ts`
  - Guards: `TeacherGuard`
  - DTO: `UpdateAvailabilityDto`
    - DTO (TS/Zod):
      ```ts
      export const WeeklyAvailabilityRuleSchema = z.object({
        id: z.number().int().optional(),
        dayOfWeek: z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5),z.literal(6)]),
        startTime: z.string(),
        endTime: z.string(),
        maxBookings: z.number().int().nullable().optional(),
      });

      export const AvailabilityExceptionSchema = z.object({
        id: z.number().int().optional(),
        date: z.string(),
        start: z.string().datetime().nullable().optional(),
        end: z.string().datetime().nullable().optional(),
        isAvailable: z.boolean(),
        note: z.string().nullable().optional(),
      });

      export const UpdateAvailabilitySchema = z.object({
        timezone: z.string(),
        rules: z.array(WeeklyAvailabilityRuleSchema),
        exceptions: z.array(AvailabilityExceptionSchema),
      });

      export type UpdateAvailabilityDto = z.infer<typeof UpdateAvailabilitySchema>;
      ```
  - Response: `GetAvailabilityResponse`
  - Notes: Service persists rules and exceptions. PUT should be idempotent and replace existing rule set. Return the saved `GetAvailabilityResponse`.

- POST /teachers/me/availability/preview
  - File: `teachers/teachers.controller.ts`
  - Guards: `TeacherGuard`
  - DTO: `PreviewMyAvailabilityDto`
    - DTO (TS/Zod): same as `PreviewAvailabilitySchema` but without `teacherId` (server uses auth)
      ```ts
      export const PreviewMyAvailabilitySchema = PreviewAvailabilitySchema.omit({ teacherId: true });
      export type PreviewMyAvailabilityDto = z.infer<typeof PreviewMyAvailabilitySchema>;
      ```
  - Response: `PreviewAvailabilityResponse` (same as public preview response)
  - Notes: Useful for teachers to preview their saved rules before publishing.

- GET /teachers/me/stats
  - File: `teachers/teachers.controller.ts`
  - Guards: `TeacherGuard`
  - Response: `TeacherStatsDto` (TS):
    ```ts
    export type TeacherStatsDto = {
      totalHoursTaught: number;
      totalStudents: number;
      upcomingSessionsCount: number;
      earningsPeriod?: { start: string; end: string; amount: number }[];
    }
    ```
  - Notes: Keep shape flexible; used by teacher dashboard.

- GET /teachers/me/sessions
  - File: `teachers/teachers.controller.ts`
  - Guards: `TeacherGuard`
  - Query: start (ISO datetime), end (ISO datetime), limit?, page?
  - Response: `Session[]` (use existing `Session` type from `shared/types/session.ts` when migrated)
  - Notes: Return sessions filtered by start/end and paginated when requested.

- GET /teachers/me/profile
  - File: `teachers/teachers-profile.controller.ts`
  - Guards: `TeacherGuard`
  - Response: `TeacherProfileDto` (TS):
    ```ts
    export type TeacherProfileDto = {
      id: number;
      userId: number;
      headline?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
      languages?: string[];
      specialties?: string[];
      pricing?: { private?: number; group?: number } | null;
      availabilityPreview?: GetAvailabilityResponse | null;
    }
    ```
  - Zod schema name: `TeacherProfileSchema`
  - Notes: This is the editable profile returned to the authenticated teacher.

- PATCH /teachers/me/profile
  - File: `teachers/teachers-profile.controller.ts`
  - Guards: `TeacherGuard`
  - DTO: `UpdateTeacherProfileDto`
    - DTO (TS/Zod):
      ```ts
      export const UpdateTeacherProfileSchema = z.object({
        headline: z.string().nullable().optional(),
        bio: z.string().nullable().optional(),
        avatarUrl: z.string().nullable().optional(),
        languages: z.array(z.string()).optional(),
        specialties: z.array(z.string()).optional(),
        pricing: z.object({ private: z.number().optional(), group: z.number().optional() }).nullable().optional(),
      });
      export type UpdateTeacherProfileDto = z.infer<typeof UpdateTeacherProfileSchema>;
      ```
  - Response: `TeacherProfileDto` (updated resource)
  - Notes: PATCH should accept partial fields and return the updated profile.

Migration guidance (teachers endpoints)
- Move the DTOs/Zod schemas above into `shared/types/teachers.ts` and export both TS types and Zod schemas. Name exports consistently: `GetAvailabilityResponseSchema`, `UpdateAvailabilitySchema`, `TeacherProfileSchema`, etc.
- Update `nestjs/src/teachers/*` controllers to import schemas from `shared/types` and continue using `ZodValidationPipe` where applied.
- Add unit tests for availability preview logic (happy path + daylight savings / timezone edge case) and for PUT idempotency.

Testing notes
- Add tests in `nestjs/test/teacher-availability.e2e.spec.ts` to assert preview windows and full save/restore of availability rules.
- Add a small property-based test or table-driven test for rule overlap/conflict detection.

Backward compatibility
- Keep existing controller behaviour; do the migration in small steps: export types from `shared/types` and update one controller at a time, running tests after each change.

---

- PAYMENTS (File: `payments/payments.controller.ts`)

- GET /payments/stripe-key
  - File: `payments.controller.ts`
  - Response: { publishableKey: string }

- POST /payments/create-session
  - File: `payments.controller.ts`
  - DTO: `CreateSessionSchema` / inferred zod type
  - Validation: `ZodValidationPipe(CreateSessionSchema)`
  - Uses `x-auth-user-id` header
  - Response: { clientSecret: string }

- POST /payments/book-with-package
  - File: `payments.controller.ts`
  - DTO: inline `BookWithPackageSchema` (packageId, sessionId, confirmed?)
  - Uses `x-auth-user-id` header

- POST /payments/payment-intent
  - File: `payments.controller.ts`
  - DTO: `CreatePaymentIntentSchema` / `CreatePaymentIntentDto`
  - Response: `CreatePaymentIntentResponse` (exported from payments.service.js)
  - Uses `x-auth-user-id` header

- Webhooks
  - POST /webhooks/stripe
    - File: `payments/webhooks.controller.ts`
    - Raw body used, header `stripe-signature` required
    - Response: { received: true }

---

- PACKAGES (File: `packages/packages.controller.ts`, `packages/admin-packages.controller.ts`)

- GET /packages
  - File: `packages.controller.ts`
  - Response: active packages

- GET /packages/my-credits
  - File: `packages.controller.ts`
  - Uses `x-auth-user-id` header
  - Response: packages & credits for student

- GET /packages/compatible-for-session/:sessionId
  - File: `packages.controller.ts`
  - Uses `x-auth-user-id` header
  - Response: packages compatible with session

- POST /packages/:id/use
  - File: `packages.controller.ts`
  - DTO: `UsePackageSchema` (zod) — either sessionId or bookingData

- Admin: POST /admin/packages
  - File: `packages/admin-packages.controller.ts`
  - DTO: `CreatePackageSchema` / `CreatePackageDto`
  - Guards: `AdminGuard`

- GET /admin/packages
  - File: `packages/admin-packages.controller.ts`
  - Guards: `AdminGuard`

- GET /admin/packages/:id
  - File: `packages/admin-packages.controller.ts`
  - Guards: `AdminGuard`

- POST /admin/packages/:id/deactivate
  - File: `packages/admin-packages.controller.ts`
  - Guards: `AdminGuard`

---

- WAITLISTS (File: `waitlists/waitlists.controller.ts`)

- POST /waitlists
  - File: `waitlists.controller.ts`
  - DTO: `JoinWaitlistSchema` / `JoinWaitlistDto`
  - Uses `x-auth-user-id` header
  - Response: `WaitlistResponseDto`

- GET /waitlists/me
  - File: `waitlists.controller.ts`
  - Uses `x-auth-user-id` header
  - Response: `WaitlistWithSessionDto[]`

- GET /waitlists/session/:sessionId
  - File: `waitlists.controller.ts`
  - Guards: `AdminGuard`
  - Response: `WaitlistWithStudentDto[]`

- DELETE /waitlists/:id
  - File: `waitlists.controller.ts`
  - Uses `x-auth-user-id` header
  - Response: { success: boolean }

- POST /waitlists/:id/notify
  - File: `waitlists.controller.ts`
  - Guards: `AdminGuard`
  - DTO: `NotifyWaitlistSchema` / `NotifyWaitlistDto`

- POST /waitlists/:id/promote
  - File: `waitlists.controller.ts`
  - Guards: `AdminGuard`
  - DTO: `PromoteWaitlistSchema` / `PromoteWaitlistDto`

---

- GROUP CLASSES (File: `group-classes/group-classes.controller.ts`)

- GET /group-classes
  - File: `group-classes.controller.ts`
  - Response: `GroupClassListDto[]`

- GET /group-classes/available
  - File: `group-classes.controller.ts`
  - Query: levelId, teacherId, startDate, endDate

- GET /group-classes/:id
  - File: `group-classes.controller.ts`
  - Response: `GroupClassListDto | null`

- POST /group-classes/:id/generate-sessions
  - File: `group-classes.controller.ts`
  - Response: `Session[]`

- POST /group-classes
  - File: `group-classes.controller.ts`
  - Guards: `AdminGuard`
  - DTO: `CreateGroupClassSchema` / `CreateGroupClassDto`

---

- LEVELS (File: `levels/levels.controller.ts`)

- GET /levels
  - File: `levels.controller.ts`
  - Response: `Level[]`

---

Notes & Handover guidance:
- Each endpoint entry lists DTOs and Zod schemas when present. The migrating AI should:
  1. Move the DTO/schema to `shared/types/` (keeping zod runtime schema where used).
  2. Export both TypeScript types and Zod schemas (when applicable) from `shared/types` with clear names.
  3. Update imports in NestJS controllers/services to use `shared/types`.
  4. Update front-end imports to use `shared/types` (or generated JSON schemas for PHP where necessary).
  5. Run tests and typechecks after each endpoint migration.

- Special headers: many endpoints rely on `x-auth-user-id` header injected by Nginx. Ensure this remains documented and handled.

- For Webhooks: `POST /webhooks/stripe` uses raw body and Stripe signature — keep schema placement minimal; runtime verification remains in payments.service.

- If a DTO is used across multiple endpoints (e.g., `CreatePaymentIntentDto`), migrate it once and update all usages.

---

End of inventory. If you want, I can now:
- Produce `docs/nestjs-dtos.md` listing files and the exact DTO exports to move.
- Start moving a small subset of DTOs (e.g., `CreatePaymentIntentDto`, `CancelBookingDto`, availability DTOs) into `shared/types` as a proof-of-concept.
