# MVP Gaps Analysis

This document details the specific missing features that are blocking MVP launch, organized by priority and estimated effort.

## 🔴 CRITICAL BLOCKERS (Must Have for MVP)

### 1. Admin Curriculum Builder UI

**Current State:**  
- ✅ Backend API exists (`/admin/course-programs`)
- ✅ Database schema supports courses, steps, options
- 🔴 No frontend UI for admins to create courses

**What's Needed:**  
Admin interface (Vue.js in `thrive-admin` plugin) for:
- Creating course programs (title, description, code, timezone)
- Adding/removing/reordering course steps
- Attaching group class options to steps
- Publishing courses (setting active status)

**Impact:** **Blocks** course creation; cannot offer courses without this

**Files to Create:**
- `apps/wordpress/plugins/thrive-admin/src/components/CourseProgramsAdmin.vue`
- `apps/wordpress/plugins/thrive-admin/src/components/CourseProgramForm.vue`
- `apps/wordpress/plugins/thrive-admin/src/components/CourseStepManager.vue`

**Related Docs:**  
- `../course-programs-admin-ui.md` (detailed UI specs)
- `../course-programs-simplified-architecture.md`

**Estimate:** 1.5-2 weeks  
**Complexity:** Medium (standard CRUD UI with drag-and-drop reordering)  
**Dependencies:** None (backend complete)

---

### 2. Course Enrollment & Payment Flow

**Current State:**  
- ✅ Course browsing works (`/course-programs/browse`)
- ✅ Course detail pages display cohorts
- ✅ Stripe checkout works for packages
- 🔴 Enrollment endpoint incomplete
- 🔴 Webhook doesn't handle course purchases
- 🔴 Auto-booking logic missing
- 🔴 Session selection wizard not connected

**What's Needed:**  
1. **Enrollment API** (`POST /course-programs/:code/cohorts/:cohortId/enroll`)
   - Validate cohort not full
   - Create Stripe checkout session with metadata
   - Return checkout URL

2. **Webhook Handler** (`WebhooksController`)
   - Detect course purchase from metadata
   - Create `StudentPackage` with cohort reference
   - Seed `StudentCourseStepProgress` rows
   - Auto-book single-option steps
   - Trigger session wizard for multi-option steps

3. **Session Selection Wizard** (Frontend)
   - Modal after successful payment
   - Show steps with multiple options
   - Allow student to choose preferred sessions
   - Submit selections to `/students/me/course-packages/:id/book-sessions`

**Impact:** **Blocks** course sales; students cannot enroll

**Files to Modify:**
- `apps/nestjs/src/course-programs/controllers/enrollment.controller.ts`
- `apps/nestjs/src/payments/webhooks.controller.ts`
- `apps/nestjs/src/payments/payments.service.ts`
- `apps/wordpress/themes/custom-theme/blocks/course-cohorts/components/CourseCohorts.tsx`
- `apps/wordpress/themes/custom-theme/blocks/session-selection-wizard/components/SessionSelectionWizard.tsx`

**Related Docs:**  
- `../course-student-view/05-enrollment-flow.md`
- `../course-programs-stripe-integration.md`

**Estimate:** 1-2 weeks  
**Complexity:** Medium-High (Stripe + auto-booking logic)  
**Dependencies:** Course Programs Phase 3 complete

---

### 3. Teacher Assessment Dashboard

**Current State:**  
- ✅ Students can submit answers to questions
- ✅ Multiple choice auto-graded
- ✅ Backend stores long-form submissions
- 🔴 No UI for teachers to review submissions
- 🔴 No feedback submission interface

**What's Needed:**  
Teacher dashboard Vue component for:
- Viewing queue of pending assessments
- Filtering by course, student, question type
- Reviewing student submissions (text, files, videos)
- Providing written feedback
- Marking as "Approved" or "Needs Revision"
- Notifications when new submissions arrive

**Impact:** **Blocks** assessable course content; limits course value

**Files to Create:**
- `apps/wordpress/plugins/thrive-admin/src/components/AssessmentQueue.vue`
- `apps/wordpress/plugins/thrive-admin/src/components/AnswerReview.vue`
- `apps/wordpress/plugins/thrive-admin/src/components/FeedbackForm.vue`

**API Endpoints Needed:**
- `GET /assessment/queue` (already exists per plan)
- `POST /assessment/answers/:answerId` (already exists per plan)

**Related Docs:**  
- `../course-materials-plan.md` (Phase 4)

**Estimate:** 1 week  
**Complexity:** Low-Medium (mostly UI work, backend ready)  
**Dependencies:** Course Materials backend (complete)

---

### 4. Bundle Packages Service Layer

**Current State:**  
- ✅ Database schema migrated (`package_allowance` table exists)
- ✅ Entities created (`PackageAllowance`, `StudentPackageBalance`)
- 🔴 `PackagesService` still uses old single-service-type logic
- 🔴 `PaymentsService` doesn't create balances on purchase
- 🔴 `BookingsService` doesn't select correct balance

**What's Needed:**  
Comprehensive service refactoring to support bundles with multiple service types:

1. **PackagesService** - 12 methods to refactor
   - `createPackage()` - Accept allowances array, create PackageAllowance rows
   - `getPackages()` - Load with allowances relation
   - `usePackageForSession()` - Find compatible balance, decrement correct type
   - See `../phase4-implementation-checklist.md` for step-by-step

2. **PaymentsService** - Webhook handler
   - Parse allowances from Stripe metadata
   - Create `StudentPackageBalance` row for each allowance
   - Update booking logic to reference balances

3. **BookingsService** - Balance selection
   - Find compatible balance for session
   - Refund to correct balance on cancellation

**Impact:** **Blocks** flexible pricing; can only sell single-service packages

**Files to Modify:**
- `apps/nestjs/src/packages/packages.service.ts` (primary focus)
- `apps/nestjs/src/payments/payments.service.ts`
- `apps/nestjs/src/bookings/bookings.service.ts`
- `apps/nestjs/src/common/types/credit-tiers.ts`

**Related Docs:**  
- `../bundle-packages-implementation-plan.md` (comprehensive guide)
- `../phase4-implementation-checklist.md` (step-by-step checklist)  
- `../bundle-packages-service-refactoring.md`

**Estimate:** 2-3 weeks  
**Complexity:** High (touches multiple critical services, balance logic)  
**Dependencies:** None (can run in parallel with courses)

---

### 5. Group Classes Admin UI & Student Booking

**Current State:**  
- ✅ Database schema complete (`group_class`, `group_class_teacher`)
- ✅ Basic controller endpoints exist
- 🔴 No admin UI for creating/managing group classes
- 🔴 No student booking interface
- 🔴 RRULE session generation not implemented

**What's Needed:**  
**Admin UI:**
- Create/edit group classes (Vue component in `thrive-admin`)
- RRULE builder for recurring schedules (weekly, specific days)
- Teacher assignment interface
- Generate sessions from RRULE
- View enrollment per session

**Student Booking:**
- Calendar view filtered by level
- Available group sessions display
- Book with package credit or pay directly
- Join waitlist if full

**Impact:** Limits revenue streams; group classes more profitable than 1:1

**Files to Create:**
- `apps/wordpress/plugins/thrive-admin/src/components/GroupClassesAdmin.vue`
- `apps/wordpress/plugins/thrive-admin/src/components/GroupClassForm.vue`
- `apps/wordpress/plugins/thrive-admin/src/components/RRuleBuilder.vue`
- `apps/wordpress/themes/custom-theme/blocks/group-class-calendar/` (new block)

**Files to Modify:**
- `apps/nestjs/src/group-classes/group-classes.service.ts` (add RRULE generation)
- `apps/nestjs/src/group-classes/group-classes.controller.ts` (complete endpoints)

**Related Docs:**  
- `../group-classes-plan.md` (comprehensive 1600+ line spec)

**Estimate:** 2-3 weeks  
**Complexity:** Medium-High (RRULE parsing, capacity tracking)  
**Dependencies:** None

---

## 🟡 IMPORTANT (Needed Soon After MVP)

### 6. Student Dashboard Enhancements

**Missing:**
- Course progress widgets (% complete)
- Quick links to next material
- Improved upcoming sessions view
- Recent activity feed

**Estimate:** 1 week  
**Related:** `../course-student-view/06-student-dashboard.md`

---

### 7. Calendar Integration for Course Sessions

**Missing:**
- Show course sessions on `StudentCalendar` block
- Filter toggle (private / group / course)
- Visual distinction for course sessions

**Estimate:** 3-4 days  
**Related:** `../course-student-view/07-calendar-integration.md`

---

### 8. Booking Cancellation System

**Missing:**
- Student-initiated cancellations
- Policy enforcement (24hr notice, etc.)
- Credit refund to correct balance
- Admin override capability

**Estimate:** 1 week  
**Related:** `../student-booking-cancellation-plan.md`

---

### 9. File Upload System for Course Materials

**Missing:**
- Student file upload for question submissions
- Video upload support
- Authenticated URLs for downloads
- Storage limits and validation

**Estimate:** 3-5 days  
**Related:** `../wordpress-upload-system.md`

---

### 10. Homepage Polish

**Missing:**
- Marketing-quality hero section
- Testimonials section
- Feature highlights
- Mobile optimization
- Conversion tracking

**Estimate:** 3-5 days  
**Status:** In progress (per conversation history)

---

## 📊 Gap Summary by Category

| Category | Critical Gaps | Important Gaps | Total Effort |
|----------|--------------|----------------|--------------|
| Admin Tools | 3 | 0 | 5-7 weeks |
| Student Features | 1 | 3 | 3-4 weeks |
| Payment/Packages | 1 | 1 | 3-4 weeks |
| Infrastructure | 0 | 1 | 3-5 days |
| Marketing | 0 | 1 | 3-5 days |

---

## Completion Criteria Per Gap

Each gap includes specific acceptance criteria in its task file (see `tasks/` directory).

**Example - Admin Curriculum Builder:**
- [ ] Can create course program with code, title, description
- [ ] Can add steps with order numbers
- [ ] Can attach group class options to steps
- [ ] Can reorder steps via drag-and-drop
- [ ] Can delete steps with confirmation
- [ ] Can set course active/inactive
- [ ] Changes persist to database correctly
- [ ] UI handles errors gracefully

---

## Dependency Graph

```
┌─────────────────────────────────────┐
│  Admin Curriculum Builder (Task 1)  │  ← No dependencies
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Enrollment Flow (Task 2)           │  ← Depends on Task 1
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Bundle Packages (Task 4)           │  ← Can run in parallel
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Teacher Assessment (Task 3)        │  ← Can run in parallel
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Group Classes (Task 5)             │  ← Can run after Task 4
└─────────────────────────────────────┘
```

**Parallelization Strategy:**
- **Stream 1:** Task 1 → Task 2
- **Stream 2:** Task 4 (Bundle Packages)
- **Stream 3:** Task 3 (Assessment) + Task 5 (Group Classes)

---

*For detailed implementation guidance, see individual task files in `tasks/`*
