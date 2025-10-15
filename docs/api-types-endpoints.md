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
  - Response: list of PublicTeacherDto

- GET /teachers/:id
  - File: `teachers/teachers.public.controller.ts`
  - Response: `PublicTeacherDto`

- POST /teachers/availability/preview
  - File: `teachers/teachers.public.controller.ts`
  - DTO: `PreviewAvailabilityDto`
  - Response: preview windows

- GET /teachers/me/availability
  - File: `teachers/teachers.controller.ts`
  - Guards: `TeacherGuard`
  - Response: availability rules & exceptions (GetAvailabilityResponse)

- PUT /teachers/me/availability
  - File: `teachers/teachers.controller.ts`
  - Guards: `TeacherGuard`
  - DTO: `UpdateAvailabilityDto`
  - Response: GetAvailabilityResponse

- POST /teachers/me/availability/preview
  - File: `teachers/teachers.controller.ts`
  - Guards: `TeacherGuard`
  - DTO: `PreviewMyAvailabilityDto`
  - Response: PreviewAvailabilityResponse

- GET /teachers/me/stats
  - File: `teachers/teachers.controller.ts`
  - Guards: `TeacherGuard`

- GET /teachers/me/sessions
  - File: `teachers/teachers.controller.ts`
  - Guards: `TeacherGuard`
  - Query: start, end

- GET /teachers/me/profile
  - File: `teachers/teachers-profile.controller.ts`
  - Guards: `TeacherGuard`

- PATCH /teachers/me/profile
  - File: `teachers/teachers-profile.controller.ts`
  - Guards: `TeacherGuard`
  - DTO: `UpdateTeacherProfileDto`

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
