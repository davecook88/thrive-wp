# Course Programs: Implementation Roadmap

## Overview
This document provides a complete implementation roadmap for the course-programs feature, with prioritized phases, time estimates, and dependencies between components.

---

## Documentation Reference

This roadmap references the following detailed implementation documents:

1. **[course-programs-legacy-cleanup.md](course-programs-legacy-cleanup.md)** - Remove old course system
2. **[course-programs-backend-implementation.md](course-programs-backend-implementation.md)** - NestJS DTOs, services, controllers
3. **[course-programs-stripe-integration.md](course-programs-stripe-integration.md)** - Stripe products, webhooks, bundled credits
4. **[course-programs-wordpress-frontend.md](course-programs-wordpress-frontend.md)** - WordPress templates, React components
5. **[course-programs-admin-ui.md](course-programs-admin-ui.md)** - Minimal admin interface

Additional design references:
- **[course-programs-plan.md](course-programs-plan.md)** - Original feature plan
- **[course-programs-erd.md](course-programs-erd.md)** - Database schema documentation

---

## Implementation Phases

### Phase 0: Pre-Implementation (CRITICAL - DO FIRST)
**Estimated Time:** 3-4 hours

**Tasks:**
1. ✅ Review and understand all documentation
2. ✅ Verify database migration exists (`1760000000000-AddCourseProgramsTables.ts`)
3. ✅ Verify all entities are created and exported
4. ❌ **Run legacy cleanup** (see [course-programs-legacy-cleanup.md](course-programs-legacy-cleanup.md))
   - Remove old Course, CourseEnrollment, CourseTeacher entities
   - Update Session entity (remove courseId field)
   - Update Student/Teacher entity relations
   - Update students service
   - Create and run RemoveLegacyCourseTables migration
5. ❌ **Run AddCourseProgramsTables migration**
6. ❌ Verify tables exist in database
7. ❌ Create feature branch: `feature/course-programs`

**Acceptance Criteria:**
- [ ] All legacy course code removed
- [ ] Migration successful (no errors)
- [ ] All 6 new tables exist: `course_program`, `course_step`, `course_step_option`, `course_bundle_component`, `student_course_enrollment`, `student_course_progress`
- [ ] TypeScript builds without errors
- [ ] Existing tests pass

---

### Phase 1: Backend Foundation
**Estimated Time:** 8-12 hours

**See:** [course-programs-backend-implementation.md](course-programs-backend-implementation.md)

#### 1.1 DTOs and Validation (3-4 hours)
**Files to Create:**
- `apps/nestjs/src/course-programs/dto/admin/*.dto.ts` (7 files)
- `apps/nestjs/src/course-programs/dto/public/*.dto.ts` (4 files)

**Tasks:**
- [ ] Create all admin DTOs with Zod schemas
- [ ] Create all public DTOs with Zod schemas
- [ ] Write unit tests for DTO validation
- [ ] Test valid and invalid inputs

#### 1.2 Services (5-8 hours)
**Files to Create:**
- `apps/nestjs/src/course-programs/services/course-programs.service.ts`
- `apps/nestjs/src/course-programs/services/course-steps.service.ts`
- `apps/nestjs/src/course-programs/services/course-enrollments.service.ts`
- `apps/nestjs/src/course-programs/services/course-progress.service.ts`

**Tasks:**
- [ ] Implement CourseProgramsService (CRUD, validation)
- [ ] Implement CourseStepsService (steps + options)
- [ ] Implement CourseEnrollmentsService (enrollment management)
- [ ] Implement CourseProgressService (progress tracking)
- [ ] Write service unit tests (mock repositories)
- [ ] Test error handling

**Acceptance Criteria:**
- [ ] All services compile without errors
- [ ] Unit tests achieve >80% coverage
- [ ] Services handle errors gracefully
- [ ] Can create course program via service

---

### Phase 2: Backend API Endpoints
**Estimated Time:** 6-8 hours

**See:** [course-programs-backend-implementation.md](course-programs-backend-implementation.md)

#### 2.1 Controllers (4-5 hours)
**Files to Create:**
- `apps/nestjs/src/course-programs/controllers/admin-course-programs.controller.ts`
- `apps/nestjs/src/course-programs/controllers/course-programs.controller.ts`

**Tasks:**
- [ ] Implement AdminCourseProgramsController (12 endpoints)
- [ ] Implement CourseProgramsController (4 endpoints)
- [ ] Add Swagger/OpenAPI documentation
- [ ] Write controller integration tests
- [ ] Test with Postman/Insomnia

**Endpoints to Implement:**

**Admin (`/admin/course-programs`):**
- POST `/` - Create course program
- GET `/` - List all programs
- GET `/:id` - Get program detail
- PUT `/:id` - Update program
- DELETE `/:id` - Delete program
- POST `/:id/steps` - Create step
- PUT `/steps/:stepId` - Update step
- DELETE `/steps/:stepId` - Delete step
- POST `/steps/:stepId/options` - Attach class
- DELETE `/steps/options/:optionId` - Detach class
- GET `/steps/:stepId/options` - List options
- POST `/:id/publish` - Publish to Stripe

**Public (`/course-programs`):**
- GET `/` - List active programs
- GET `/:id` - Get program detail
- GET `/:id/enrollment-status` - Get enrollment status
- GET `/me/enrollments` - Get my enrollments

#### 2.2 Guards (1-2 hours)
**Files to Create:**
- `apps/nestjs/src/course-programs/guards/course-enrollment.guard.ts`

**Tasks:**
- [ ] Implement CourseEnrollmentGuard
- [ ] Write guard unit tests
- [ ] Test guard with various scenarios

#### 2.3 Module Registration (1 hour)
**Files to Create:**
- `apps/nestjs/src/course-programs/course-programs.module.ts`

**Tasks:**
- [ ] Create CourseProgramsModule
- [ ] Import in AppModule
- [ ] Verify all dependencies registered
- [ ] Test module initialization

**Acceptance Criteria:**
- [ ] All endpoints respond correctly
- [ ] Postman tests pass
- [ ] Guards enforce authorization
- [ ] Module loads without errors
- [ ] Can CRUD course programs via API

---

### Phase 3: Stripe Integration
**Estimated Time:** 6-8 hours

**See:** [course-programs-stripe-integration.md](course-programs-stripe-integration.md)

#### 3.1 Product Creation (2-3 hours)
**Files to Modify:**
- `apps/nestjs/src/payments/stripe.service.ts`
- `apps/nestjs/src/course-programs/services/course-programs.service.ts`

**Tasks:**
- [ ] Add `createCourseProduct()` to StripeService
- [ ] Add `updateCourseProduct()` to StripeService
- [ ] Add `createNewCoursePrice()` to StripeService
- [ ] Implement `buildBundleSummary()` helper
- [ ] Complete `publishToStripe()` in CourseProgramsService
- [ ] Test product creation in Stripe dashboard

#### 3.2 Webhook Handling (3-4 hours)
**Files to Modify:**
- `apps/nestjs/src/payments/webhooks.controller.ts`

**Tasks:**
- [ ] Add `handleCoursePurchase()` method
- [ ] Add `issueBundledCredits()` method
- [ ] Add `handleCourseRefund()` method
- [ ] Add `revokeBundledCredits()` method
- [ ] Implement idempotency checks
- [ ] Test with Stripe CLI

#### 3.3 Checkout Flow (1-2 hours)
**Files to Modify:**
- `apps/nestjs/src/payments/stripe.service.ts`
- `apps/nestjs/src/course-programs/controllers/course-programs.controller.ts`

**Tasks:**
- [ ] Add `createCourseCheckoutSession()` to StripeService
- [ ] Add `POST /:id/checkout` endpoint
- [ ] Test checkout URL generation
- [ ] Test complete purchase flow

**Acceptance Criteria:**
- [ ] Can publish course to Stripe
- [ ] Stripe product/price created correctly
- [ ] Webhook handles purchase successfully
- [ ] Enrollment created on purchase
- [ ] Bundled credits issued correctly
- [ ] Refund webhook revokes enrollment

---

### Phase 4: Admin UI (Minimal)
**Estimated Time:** 10-14 hours

**See:** [course-programs-admin-ui.md](course-programs-admin-ui.md)

#### 4.1 Admin Page Setup (2 hours)
**Files to Create:**
- `wordpress/themes/custom-theme/admin-templates/course-programs.php`

**Tasks:**
- [ ] Register WordPress admin menu
- [ ] Create admin page template
- [ ] Set up React root element
- [ ] Configure webpack entry point
- [ ] Test admin page loads

#### 4.2 Course Program List (2-3 hours)
**Files to Create:**
- `src/admin/pages/CoursePrograms.tsx`

**Tasks:**
- [ ] Implement list page with table
- [ ] Add create/edit/delete actions
- [ ] Add published status indicators
- [ ] Test CRUD operations

#### 4.3 Course Program Form (2-3 hours)
**Files to Create:**
- `src/admin/pages/CourseProgramForm.tsx`

**Tasks:**
- [ ] Implement create/edit form
- [ ] Add form validation
- [ ] Test form submission
- [ ] Test error handling

#### 4.4 Step Manager (3-4 hours)
**Files to Create:**
- `src/admin/pages/CourseStepManager.tsx`
- `src/admin/components/GroupClassSelector.tsx`

**Tasks:**
- [ ] Implement step listing
- [ ] Add create step modal
- [ ] Add delete step functionality
- [ ] Implement group class selector
- [ ] Test attach/detach classes
- [ ] Test step ordering

#### 4.5 Publish Flow (1-2 hours)
**Files to Create:**
- `src/admin/pages/PublishCourse.tsx`

**Tasks:**
- [ ] Implement publish page
- [ ] Add validation checks
- [ ] Add price input form
- [ ] Test Stripe integration
- [ ] Test price updates

**Acceptance Criteria:**
- [ ] Admin can create course programs
- [ ] Admin can add/remove steps
- [ ] Admin can attach group classes to steps
- [ ] Admin can publish to Stripe
- [ ] All forms validate correctly
- [ ] Error messages are clear

---

### Phase 5: WordPress Frontend
**Estimated Time:** 8-12 hours

**See:** [course-programs-wordpress-frontend.md](course-programs-wordpress-frontend.md)

#### 5.1 API Client (2-3 hours)
**Files to Create:**
- `wordpress/plugins/thrive-admin/includes/api/course-programs.php`
- `wordpress/themes/custom-theme/functions/course-programs.php`

**Tasks:**
- [ ] Create CourseProgramsAPI class
- [ ] Implement all API methods
- [ ] Create helper functions
- [ ] Test API calls
- [ ] Add error handling

#### 5.2 Templates (3-4 hours)
**Files to Create:**
- `wordpress/themes/custom-theme/templates/course-catalog.php`
- `wordpress/themes/custom-theme/templates/course-detail.php`

**Tasks:**
- [ ] Create course catalog template
- [ ] Create course detail template
- [ ] Add purchase CTA buttons
- [ ] Test responsive design
- [ ] Test with various data states

#### 5.3 Student Dashboard (2-3 hours)
**Files to Modify:**
- `wordpress/themes/custom-theme/src/pages/StudentDashboard.tsx`

**Tasks:**
- [ ] Add courses tab
- [ ] Implement enrollment list
- [ ] Implement progress display
- [ ] Add links to book steps
- [ ] Test dashboard display

#### 5.4 Calendar Integration (1-2 hours)
**Files to Modify:**
- Calendar event components

**Tasks:**
- [ ] Add course metadata to events
- [ ] Display course step badges
- [ ] Add enrollment check before booking
- [ ] Test booking flow

**Acceptance Criteria:**
- [ ] Course catalog displays correctly
- [ ] Course detail shows all steps
- [ ] Students can purchase courses
- [ ] Dashboard shows enrollment progress
- [ ] Calendar displays course sessions

---

### Phase 6: Booking Integration
**Estimated Time:** 4-6 hours

**See:** [course-programs-plan.md](course-programs-plan.md) (lines 96-122)

#### 6.1 Booking Service Updates (2-3 hours)
**Files to Modify:**
- `apps/nestjs/src/bookings/bookings.service.ts`
- `apps/nestjs/src/bookings/bookings.controller.ts`

**Tasks:**
- [ ] Accept `courseStepId` in booking request
- [ ] Apply CourseEnrollmentGuard
- [ ] Check enrollment before booking
- [ ] Skip package credit consumption for course sessions
- [ ] Update StudentCourseProgress on booking
- [ ] Test booking validation

#### 6.2 Cancellation Updates (2-3 hours)
**Files to Modify:**
- `apps/nestjs/src/bookings/bookings.service.ts`

**Tasks:**
- [ ] Detect course bookings in cancellation flow
- [ ] Reset StudentCourseProgress status on cancel
- [ ] Refund course entitlement (not package credits)
- [ ] Test cancellation for course bookings

**Acceptance Criteria:**
- [ ] Students can book course sessions
- [ ] Booking validates enrollment
- [ ] Package credits not consumed
- [ ] Progress tracked correctly
- [ ] Cancellation works for course bookings

---

## Testing Phases

### Integration Testing
**Estimated Time:** 4-6 hours

**Tasks:**
- [ ] Test complete admin flow (create → steps → publish)
- [ ] Test complete student flow (view → purchase → enroll → book)
- [ ] Test webhook flow (purchase → enrollment → credits)
- [ ] Test cancellation flow
- [ ] Test refund flow
- [ ] Test edge cases (duplicate enrollment, missing data)

### E2E Testing
**Estimated Time:** 3-4 hours

**Tasks:**
- [ ] Write E2E test: Admin creates course
- [ ] Write E2E test: Student views and purchases course
- [ ] Write E2E test: Student books step
- [ ] Write E2E test: Student completes course
- [ ] Run all E2E tests in CI

---

## Timeline Summary

| Phase | Description | Time Estimate |
|-------|-------------|---------------|
| 0 | Pre-Implementation & Cleanup | 3-4 hours |
| 1 | Backend Foundation (DTOs + Services) | 8-12 hours |
| 2 | Backend API Endpoints | 6-8 hours |
| 3 | Stripe Integration | 6-8 hours |
| 4 | Admin UI (Minimal) | 10-14 hours |
| 5 | WordPress Frontend | 8-12 hours |
| 6 | Booking Integration | 4-6 hours |
| Testing | Integration + E2E | 7-10 hours |
| **TOTAL** | **Full Implementation** | **52-74 hours** |

**Estimated: 1.5 - 2 weeks for one developer**

---

## Dependencies & Blockers

### Critical Dependencies
1. **Phase 0 must complete first** - Legacy cleanup blocks all other work
2. **Phase 1 before Phase 2** - Services needed for controllers
3. **Phase 2 before Phase 3** - Endpoints needed for Stripe integration
4. **Phase 2 before Phase 4** - API needed for admin UI
5. **Phase 3 before Phase 5** - Checkout needed for frontend purchase flow
6. **Phase 2 before Phase 6** - Enrollment service needed for booking

### External Dependencies
- Stripe account configured
- Stripe webhook endpoint configured
- Group classes exist in database (for attaching to steps)
- WordPress theme build pipeline configured

---

## Validation Checklist

Before marking feature as complete:

### Backend
- [ ] All migrations run successfully
- [ ] All entities save/load correctly
- [ ] All API endpoints respond correctly
- [ ] All DTOs validate correctly
- [ ] All services handle errors gracefully
- [ ] Guards enforce authorization
- [ ] Webhook handles all Stripe events

### Stripe
- [ ] Products created correctly
- [ ] Prices created correctly
- [ ] Checkout sessions work
- [ ] Webhooks fire correctly
- [ ] Idempotency works
- [ ] Refunds work correctly

### Admin UI
- [ ] Can create course programs
- [ ] Can add/edit/delete steps
- [ ] Can attach/detach classes
- [ ] Can publish to Stripe
- [ ] Validation prevents invalid publishes
- [ ] Error messages are clear

### Frontend
- [ ] Course catalog displays
- [ ] Course detail shows all info
- [ ] Purchase flow works
- [ ] Dashboard shows progress
- [ ] Calendar shows course sessions
- [ ] Mobile responsive

### Booking
- [ ] Can book course sessions
- [ ] Enrollment validated
- [ ] Progress tracked
- [ ] Cancellation works
- [ ] Package credits not consumed

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual QA complete

---

## Rollout Plan

### Development
1. Create feature branch: `feature/course-programs`
2. Complete Phase 0 (cleanup) first
3. Implement phases 1-6 sequentially
4. Run tests after each phase
5. Create PR when all phases complete

### Staging
1. Deploy to staging environment
2. Run full test suite
3. Create test course programs
4. Test complete purchase flow
5. Verify Stripe webhook delivery
6. Perform load testing

### Production
1. Schedule maintenance window
2. Run migrations in production
3. Deploy backend changes
4. Deploy frontend changes
5. Configure Stripe webhooks
6. Monitor error logs
7. Create first course program
8. Announce feature to users

---

## Support & Documentation

### User Documentation Needed
- [ ] Admin guide: Creating course programs
- [ ] Admin guide: Managing steps
- [ ] Admin guide: Publishing to Stripe
- [ ] Student guide: Purchasing courses
- [ ] Student guide: Booking course sessions
- [ ] FAQ: Common questions

### Developer Documentation
- [ ] API endpoint reference
- [ ] Database schema documentation (exists)
- [ ] Webhook event handling
- [ ] Testing guide

---

## Future Enhancements (Post-MVP)

These items are explicitly **out of scope** for initial implementation:

1. Drag-drop step ordering
2. Advanced reporting dashboards
3. Multi-seat gifting
4. Course materials delivery
5. Email reminder automation
6. Analytics dashboards
7. Course certificate generation
8. Student cohort management

Refer to [course-programs-plan.md](course-programs-plan.md) (Deferred Follow-Ups section) for details.

---

## Questions & Clarifications

If you encounter any questions during implementation, refer to:

1. Design docs in `docs/course-programs-*.md`
2. Original plan: `docs/course-programs-plan.md`
3. Database schema: `docs/course-programs-erd.md`
4. This roadmap document

For architectural decisions not covered in docs, create an ADR (Architecture Decision Record) and document the choice.

---

## Success Criteria

The course-programs feature is considered complete when:

1. ✅ Admins can create course programs with multiple steps
2. ✅ Admins can attach group classes to each step
3. ✅ Admins can publish courses to Stripe with pricing
4. ✅ Students can view course catalog
5. ✅ Students can purchase courses via Stripe
6. ✅ Enrollments are created automatically on purchase
7. ✅ Bundled credits are issued correctly
8. ✅ Students can book course sessions without consuming package credits
9. ✅ Progress is tracked automatically
10. ✅ Student dashboard displays course progress
11. ✅ Cancellations work correctly
12. ✅ Refunds revoke enrollments and credits
13. ✅ All tests pass
14. ✅ Documentation complete

Good luck! 🚀
