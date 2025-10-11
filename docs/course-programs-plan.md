# Course Programs Plan

## Context
- Existing platform offers group and private classes sold through packages; course concept layers a structured sequence of group classes plus optional bundled extras.
- Admins manage Stripe products for packages today; new course products must align with that billing flow and reuse existing credit/booking systems.
- Students interact through WordPress-driven frontend that consumes NestJS APIs for calendar, booking, and payment.

## Goals
- Sell courses as Stripe products that unlock access to a predefined series of group classes ("steps") and optional bundled credits (private sessions, extra groups).
- Allow students to book one option per course step via the existing group-class booking flow after purchase.
- Surface course progress, upcoming steps, and encourage sequential booking without enforcing strict order.
- Keep waitlist logic unchanged (group classes only); cancellations refund the appropriate entitlement and let students rebook.
- Prepare for future enhancements (gifting multiple seats, course materials, advanced progress reporting).

## Key Concepts & Entities
- **CourseProgram**: High-level program definition (`code`, title, description, marketing copy, default timezone for recommendations).
- **CourseStep**: Ordered step within a course program with label (e.g. `SFZ-1`), recommended sequencing info, optional summary of content.
- **CourseStepOption**: Link between a course step and one or more `GroupClass` records representing different schedule options.
- **CourseBundleComponent**: Metadata describing bundled extras (private-session credits, additional group credits) packaged with the course purchase.
- **StudentCourseEnrollment**: Student purchase record capturing Stripe product/price ids, status, and fulfillment metadata.
- **StudentCourseProgress**: Tracks which option (if any) a student selected for each step, booking status (unbooked/booked/completed/missed/cancelled), timestamps, and credit consumption.

## High-Level Flow
1. **Admin authoring**
   - Create course shell with metadata and optional marketing assets.
   - Define ordered steps, including slug/label and overview content.
   - Attach existing or planned group classes as options for each step.
   - Configure bundled extras (private-session credits, additional group classes) and pricing.
   - Publish course, generating Stripe product/price if not already present.

2. **Student purchase**
   - Student views course detail page (WordPress) populated via NestJS API.
   - Checkout flow sells the course Stripe product; payment success triggers webhook.
   - Webhook fulfillment creates `StudentCourseEnrollment`, allocates bundled credits via existing package fulfillment logic, and seeds `StudentCourseProgress` rows for each step.

3. **Booking**
   - Calendar API surfaces course-linked group classes with step metadata.
   - Student selects an option; API validates active enrollment and ensures no other active booking for the same step.
   - On booking, mark progress entry as `booked` (or `completed` once class occurs), deduct the appropriate course entitlement.
   - Cancellation within policy refunds entitlement and resets progress for that step, allowing rebooking.

4. **Progress experience**
   - Dashboard lists enrolled courses with next recommended step, booked sessions, completion history, and remaining extras.
   - Sequence is advisory; students can skip ahead but UI encourages chronological order.

## Backend Changes (NestJS)
- **Schema & Entities** ✅ COMPLETED
  - Add `course_program`, `course_step`, `course_step_option`, `student_course_enrollment`, `student_course_progress`, `course_bundle_component` tables (snake_case columns, soft deletes where relevant).
  - Link course steps to group classes via join table `course_step_option` to support multiple classes per step.
  - TypeORM entities created with proper relationships and validation.
  - Migration `1760000000000-AddCourseProgramsTables.ts` created and ready to run.
  - See `docs/course-programs-erd.md` for complete database schema documentation.

- **Services & Repositories**
  - Course service for CRUD operations, step management, and option linkage.
  - Enrollment service handling purchase fulfillment, credit issuance, progress hydration, refund rollback.
  - Progress service for booking validation, status transitions, completion logic.

- **DTOs & Validation**
  - Define Zod schemas for admin course creation/update, step ordering, option attachments, and enrollment APIs.
  - Student-facing DTOs for listing available course classes, booking requests referencing `course_step_id`, and cancellation outcomes.

- **Controllers**
  - Admin endpoints under `/admin/courses` for create/update/delete/publish, step and option management, and bundle configuration.
  - Public endpoints `/courses` for listing, details, enrollment status, and step availability.
  - Booking controller updates to enforce course entitlement checks before group class booking when `course_step_id` present.

- **Guards & Policies**
  - New guard ensuring a booking request referencing a course step originates from a student with an active enrollment and unused entitlement for that step.
  - Update existing cancellation refund logic to recognize course entitlements and adjust `StudentCourseProgress` accordingly.

- **Stripe Integration**
  - Extend admin service to create/update Stripe product & price for courses, storing returned ids.
  - Webhook handler recognizes course product purchases, creates enrollment, issues bundled credits, and logs fulfillment.
  - Handle refunds by revoking enrollment, removing unconsumed entitlements, and deactivating progress records.

## WordPress / Frontend Considerations
- **Course Catalog UI**
  - New WordPress page/template for course overview with CTA to purchase.
  - Display schedule table grouped by step and option, showing availability and seat counts.

- **Calendar Integration**
  - Calendar API responses include course step metadata for relevant classes; UI tags them (e.g., `SFZ-1`).
  - When selecting a course class without enrollment, present modal guiding user to purchase.

- **Dashboard Enhancements**
  - Student dashboard widget listing enrolled courses, progress bar, next recommended booking, and links to materials (placeholder for future).
  - Display bundled credits (private sessions, extra groups) alongside standard package credits.

## Admin UX Enhancements
- Course builder interface mirroring package admin with step-by-step wizard.
- Step management UI for ordering, attaching classes, and reviewing seat status.
- Reporting view summarizing enrollment counts, completion rates, and revenue per course.

## Calendar & Booking Logic
- Update seat availability calculations to respect course entitlements while remaining compatible with standard group bookings.
- Ensure `GroupClass` endpoints surface whether a class is part of a course step and the associated step label/index.
- Adjust booking conflict checks: prevent multiple active bookings for the same course step per student, while allowing booking different steps simultaneously.

## Waitlists
- Reuse existing group-class waitlist logic without change; ensure UI copy references course context where relevant, but behavior stays identical.

## Progress Tracking & Analytics
- Automatically transition progress status to `completed` when attendance/lesson outcome is confirmed.
- Record timestamps for booked, completed, cancelled events to support reporting.
- Flag skipped steps (student books later step before earlier ones) for analytics.

## Notifications & Comms
- Email reminders for unbooked upcoming steps (optional feature flag).
- Booking confirmation/cancellation emails should include course step label for clarity.
- Admin alerts when seats run low for course steps to prompt scheduling additional options.

## Future Enhancements (Out of Scope Now)
- Gifting/multi-seat purchases with recipient assignment workflow.
- Course material delivery and completion tracking.
- Role-based access for teachers to upload/update course materials.
- Advanced analytics dashboard for cohort performance.

---

## TODO List for Implementation Agents

### Planning & Architecture
- [x] Finalize database ERD covering course, step, option, enrollment, progress, and bundle tables.
- [x] Validate naming conventions and relationships with existing TypeORM entities (ensure no conflicts).
- [x] Define migration rollout order and backfill strategy for existing group classes that will belong to courses.

### Backend (NestJS)
- [x] Create TypeORM entities + repositories for new tables with unit tests verifying schema mappings.
- [ ] Implement Zod DTOs and validation pipelines for admin course CRUD operations.
- [ ] Build admin course controller/service with full CRUD and publishing logic.
- [ ] Implement step/option management endpoints (attach/detach classes, update ordering).
- [ ] Extend booking flow to accept course step context and enforce entitlement guard.
- [ ] Update cancellation logic to refund/reopen course step entitlements.
- [ ] Implement enrollment service invoked by Stripe webhook (purchase + refund paths) with transactional safety.
- [ ] Enhance public API endpoints to list courses, detail steps/options, and show student enrollment status.
- [ ] Add progress tracking service updating statuses after class completion/attendance marking.
- [ ] Introduce feature flags/config for email reminders and analytics hooks (placeholders OK).

### Stripe Integration
- [ ] Extend admin product creation flow to create/update Stripe products/prices for courses with metadata (course_code, bundle summary).
- [ ] Update webhook handler to differentiate course purchases from existing packages.
- [ ] Ensure bundled credit issuance reuses existing package credit creation logic; write tests covering mixed bundles.
- [ ] Implement refund handling to revoke enrollments and deallocate unused credits.

### WordPress / Frontend
- [ ] Add API client wrappers for new course endpoints (list/detail/enrollment status).
- [ ] Build course catalog page/template with purchase CTA and schedule display.
- [ ] Update calendar UI to show course step metadata and gate booking behind enrollment checks.
- [ ] Implement purchase prompt modal routing users to checkout when required.
- [ ] Enhance student dashboard to show course progress and bundled credits summary.

### Admin Interface (WordPress/NestJS Admin)
- [ ] Design and implement course builder UI mirroring existing package admin flows.
- [ ] Provide step editing tools, including drag-and-drop ordering and class attachment widgets.
- [ ] Surface reporting dashboards for course enrollments, revenue, and completion metrics.

### Notifications & Communications
- [ ] Draft email/template updates for booking confirmations and reminders including course step info.
- [ ] Add optional reminder job (cron or queue) to nudge students to book upcoming steps.

### Testing & QA
- [ ] Write integration tests covering purchase→enrollment→booking→cancellation cycle.
- [ ] Add end-to-end tests simulating student booking flow through WordPress bridge.
- [ ] Verify Stripe webhook idempotency for course events.
- [ ] Confirm course entitlements interact correctly with existing package credit balances.

### Documentation & Ops
- [ ] Update README/GEMINI docs with course concepts and deployment considerations.
- [ ] Provide admin training notes for creating and managing courses.
- [ ] Capture runbook entries for troubleshooting enrollment or webhook issues.

### Deferred Follow-Ups
- [ ] Scope multi-seat gifting workflow (separate project).
- [ ] Plan course materials ingestion/storage pipeline.
- [ ] Evaluate analytics requirements for cohort performance dashboards.
