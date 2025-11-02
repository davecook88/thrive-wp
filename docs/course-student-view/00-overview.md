# Course Student View - Implementation Overview

## Purpose

This document provides a high-level overview of the course student view implementation, including architecture decisions, implementation order, and key technical considerations.

## Goals

1. Enable students to discover and browse available courses
2. Provide detailed course information with session calendars before purchase
3. Implement cohort-based enrollment system
4. Create streamlined enrollment and session booking flow
5. Integrate course sessions into student calendar and dashboard

## Architecture Decisions

### Data Architecture

**Single Source of Truth: NestJS**
- All course data, cohorts, sessions, and enrollment logic lives in NestJS API
- WordPress serves only as presentation layer
- No duplication of data between systems

**Link Between Systems**
- CourseProgram `code` field (e.g., "SFZ", "ADV-TECH") is the canonical identifier
- WordPress Custom Post Type uses course code as meta field to link to NestJS data
- URLs use code-based pattern: `/courses/{code}`

### WordPress Integration Pattern

**Custom Post Type + Dynamic Blocks**
- Register `thrive_course` custom post type for course detail pages
- Create specialized Gutenberg blocks that pull live data from NestJS
- Designer arranges blocks in WP editor for maximum flexibility
- No shortcodes or merge fields - blocks provide clean, component-based approach

**Gutenberg Blocks Created:**
1. Course Header Block - title, description, levels, price
2. Course Cohorts Block - available cohorts with enrollment CTAs
3. Course Sessions Calendar Block - embedded thrive-calendar
4. Course Details Block - static rich content area

### Cohort Model

**Cohort = Pre-packaged Set of Sessions**
- Admin creates cohort (e.g., "Fall 2025 Cohort")
- Admin assigns specific CourseStepOption sessions to each step within cohort
- Student enrolls in entire cohort, not individual sessions
- Each cohort has: name, start/end dates, max enrollment, deadline

**Benefits:**
- Simplifies student decision-making
- Auto-booking is trivial for single-option steps
- Clear capacity management per cohort
- Easy to communicate "Next cohort starts..."

### Enrollment Flow

**Payment First, Then Book**
1. Student browses course, sees sessions/cohorts
2. Student clicks "Enroll in [Cohort Name]"
3. System validates cohort not full
4. Redirect to Stripe checkout
5. After payment, webhook creates StudentPackage
6. System auto-books single-option steps
7. Modal prompts for multi-option step selections
8. Student can defer manual selections to dashboard

### "Full Course" Definition

**Cohort-Level Capacity:**
- Each cohort has `maxEnrollment` field
- When `currentEnrollment >= maxEnrollment`, cohort is full
- Other cohorts for same course remain bookable
- Course is only "fully booked" if ALL cohorts are full

## Implementation Order

### Phase 1: Backend Foundation (Days 1-3) ✅ COMPLETE
**Focus:** Database schema and API endpoints

**Deliverables:**
- CourseCohort entity and migrations
- CourseCohortSession join table
- Add heroImageUrl, slug to CourseProgram
- Add cohortId to StudentCourseStepProgress
- API endpoints for cohorts, sessions, browse

**Dependencies:** None

**Testing:** API endpoint tests, migration validation

**Status:** All backend entities, migrations, and API endpoints implemented and tested.

---

### Phase 2: Course List Block (Day 4) ✅ COMPLETE
**Focus:** Replace static courses-grid pattern with dynamic block

**Deliverables:**
- Course List Gutenberg block with customizable settings
- Level filtering, sorting, layout options
- Fetches from `/course-programs/browse`

**Dependencies:** Phase 1 (browse endpoint)

**Testing:** Block editor, filter functionality, responsive design

**Status:** Block implemented with all features. Files created:
- `blocks/course-list/block.json`
- `blocks/course-list/render.php`
- `blocks/course-list/index.tsx` (editor)
- `blocks/course-list/view.tsx` (frontend)
- `blocks/course-list/components/CourseList.tsx`
- `blocks/course-list/components/CourseCard.tsx`
- `blocks/course-list/components/CourseFilters.tsx`
- `blocks/course-list/style.scss`

---

### Phase 3: Course Custom Post Type + Blocks (Days 5-6) ✅ COMPLETE
**Focus:** Dynamic course detail pages

**Deliverables:**
- ✅ `thrive_course` custom post type - **IMPLEMENTED**
- ✅ Course Header Block - **IMPLEMENTED**
- ✅ Course Cohorts Block - **IMPLEMENTED**
- ✅ Course Sessions Calendar Block - **IMPLEMENTED**
- ✅ Course Details Block - **IMPLEMENTED**
- ✅ `single-thrive_course.php` template - **IMPLEMENTED (fully dynamic)**

**Dependencies:** Phase 1 (cohort/session endpoints)

**Testing:** Block functionality, API data loading, template rendering

**Status:** 
- **CPT Registration:** Custom post type `thrive_course` registered with meta box for course code and custom URL rewrite rules (`/courses/{code}`)
  - Files: `plugins/thrive-admin/includes/post-types/course.php`, `course-meta.php`
- **Template:** Fully dynamic template that renders course blocks without requiring WordPress posts
  - File: `themes/custom-theme/single-thrive_course.php`
  - Automatically validates course via NestJS API and renders blocks
- **Course Header Block:** Displays title, description, levels, price, step count
  - Files: `blocks/course-header/` (block.json, render.php, index.tsx, view.tsx, components/CourseHeader.tsx, style.css)
- **Course Cohorts Block:** Lists available cohorts with enrollment CTAs
  - Files: `blocks/course-cohorts/` (block.json, render.php, index.tsx, view.tsx, components/CourseCohorts.tsx, style.css)
- **Course Sessions Calendar Block:** Embeds thrive-calendar showing course sessions with configurable settings
  - Files: `blocks/course-sessions-calendar/` (block.json, render.php, index.tsx, view.tsx, components/CourseSessionsCalendar.tsx, style.css)
- **Course Details Block:** Simple InnerBlocks container for static rich content
  - Files: `blocks/course-details/` (block.json, render.php, index.tsx, style.css)
- **URL Pattern:** `/courses/{CODE}` works without needing WordPress posts (e.g., `/courses/FUNC`)

**Key Decision:** Template is **fully dynamic** - no WordPress posts required. The system automatically:
1. Gets course code from URL
2. Validates it exists in NestJS
3. Renders blocks with live API data

---

### Phase 4: Enrollment Flow (Days 7-8)
**Focus:** Stripe checkout and session booking

**Deliverables:**
- Cohort enrollment endpoint
- Stripe checkout with cohort metadata
- Webhook handler for course purchases
- Session booking API endpoint
- Session selection wizard React component

**Dependencies:** Phase 1 (cohort data structure), Phase 3 (enrollment CTAs)

**Testing:** Full checkout flow, webhook processing, auto-booking logic, wizard UI

---

### Phase 5: Student Dashboard (Days 9-10)
**Focus:** Course management in student dashboard

**Deliverables:**
- Update StudentCourseEnrollments component
- Add courseCode, cohortName to API responses
- Course package detail view
- "Book Remaining Sessions" functionality

**Dependencies:** Phase 1 (student package cohort data), Phase 4 (booking wizard reuse)

**Testing:** Dashboard display, booking from dashboard, progress tracking

---

### Phase 6: Calendar Integration (Day 11)
**Focus:** Display course sessions in student calendar

**Deliverables:**
- Add showCourseSessions filter to StudentCalendar
- Fetch course sessions endpoint for students
- Visual distinction for course session events

**Dependencies:** Phase 5 (student course packages)

**Testing:** Calendar display, filtering, event interaction

---

### Phase 7: Testing & Polish (Day 12)
**Focus:** End-to-end testing and refinement

**Deliverables:**
- Full user journey testing
- Error handling improvements
- Responsive design fixes
- Performance optimization

**Dependencies:** All previous phases

**Testing:** Full regression, edge cases, accessibility

## Key Technical Considerations

### URL Structure
- Current: `/courses/{code}` (e.g., `/courses/SFZ`)
- Future-proof: Add `slug` field for migration to friendly URLs
- WordPress rewrite rule maps code to CPT

### Hero Images
- Add `heroImageUrl` field to CourseProgram
- Support placeholders initially
- Designer can update via WordPress media library later
- Blocks pull image URL from NestJS API

### Level Filtering
- Course List Block fetches levels from API
- Filter dropdown populated dynamically
- Query param: `?levelId=X`

### Calendar Customization
- Course Sessions Calendar Block settings:
  - Show future sessions only (default)
  - Show all sessions (past + future)
- Filterable by date range (thrive-calendar native feature)

### Enrollment Capacity Logic
```
Cohort Status:
- Available: currentEnrollment < maxEnrollment
- Full: currentEnrollment >= maxEnrollment
- Past Deadline: now() > enrollmentDeadline

Course Status:
- Available: At least one cohort is Available
- Fully Booked: All cohorts are Full or Past Deadline
```

### Session Booking States
```
StudentCourseStepProgress.status:
- UNBOOKED: No session selected yet
- BOOKED: Session selected, future date
- COMPLETED: Session attended
- MISSED: Session date passed, not attended
- CANCELLED: Session cancelled by admin/student
```

## Data Flow Diagrams

### Course Discovery Flow
```
Student → Browse Courses Page
       → Course List Block renders
       → Fetches GET /course-programs/browse?levelId=X
       → Displays course cards with basic info
       → Click course → /courses/{code}
```

### Course Detail Flow
```
Student → /courses/SFZ
       → WordPress loads single-thrive_course.php
       → Template renders custom blocks
       → Course Header Block: GET /course-programs/SFZ
       → Course Cohorts Block: GET /course-programs/SFZ/cohorts
       → Calendar Block: GET /course-programs/SFZ/sessions
       → Student reviews cohorts + sessions
```

### Enrollment Flow
```
Student → Clicks "Enroll in Fall Cohort"
       → POST /course-programs/SFZ/cohorts/123/enroll
       → Creates Stripe checkout session (metadata: cohortId)
       → Redirects to Stripe
       → Student completes payment
       → Stripe webhook fires
       → Creates StudentPackage + StudentCourseStepProgress records (with cohortId)
       → Returns success URL
       → Modal opens: Session Selection Wizard
       → Auto-books single-option steps
       → Shows picker for multi-option steps
       → Student confirms → POST /students/me/course-packages/456/book-sessions
       → Sessions booked, progress updated
```

### Student Dashboard Flow
```
Student → /dashboard
       → StudentCourseEnrollments component renders
       → GET /students/me/course-packages
       → Displays enrolled courses with cohort info
       → Click "Book Remaining Sessions"
       → Opens Session Selection Wizard (reused from post-payment)
       → Click "View Course" → /courses/{courseCode}
```

## Success Criteria

### Phase Completion Checklist

**Phase 1 Complete When:**
- [x] CourseCohort entity created with migrations applied
- [x] All API endpoints return correct data structure
- [x] TypeScript types defined in shared package
- [x] Unit tests pass for cohort services

**Phase 2 Complete When:**
- [x] Course List Block visible in block inserter
- [x] Block settings control layout/filtering
- [x] Level filter works correctly
- [x] Responsive on mobile/tablet/desktop

**Phase 3 Complete When:**
- [x] Custom post type registered
- [x] All four course blocks functional (Header, Cohorts, Sessions Calendar, Details)
- [x] Template renders blocks correctly (fully dynamic, no WP posts needed)
- [x] Data loads from NestJS API without errors
- [x] Course Sessions Calendar Block implemented
- [x] Course Details Block implemented

**Phase 4 Complete When:**
- [ ] Student can complete checkout for cohort
- [ ] Webhook creates StudentPackage correctly
- [ ] Auto-booking works for single-option steps
- [ ] Wizard shows for multi-option steps
- [ ] Manual session selection persists correctly

**Phase 5 Complete When:**
- [ ] Dashboard shows enrolled courses with cohort names
- [ ] "Book Remaining Sessions" button appears for unbooked steps
- [ ] Course package detail view displays all info
- [ ] Progress tracking updates correctly

**Phase 6 Complete When:**
- [ ] Course sessions appear on student calendar
- [ ] Filter toggle works (show/hide course sessions)
- [ ] Visual distinction clear from other events
- [ ] Clicking session shows details

**Phase 7 Complete When:**
- [ ] Full enrollment flow works end-to-end
- [ ] Error states handled gracefully
- [ ] Responsive design verified
- [ ] Performance acceptable (<2s page loads)

## Risk Mitigation

### Identified Risks

**Risk 1: WordPress Block Performance**
- *Issue:* Multiple blocks making separate API calls could slow page load
- *Mitigation:* Implement client-side caching, consider SSR for critical data

**Risk 2: Stripe Webhook Reliability**
- *Issue:* Webhook failure could leave student paid but not enrolled
- *Mitigation:* Idempotent webhook handling, retry logic, manual reconciliation tool

**Risk 3: Cohort Capacity Race Conditions**
- *Issue:* Multiple students enrolling simultaneously could exceed capacity
- *Mitigation:* Database transaction with row locking on cohort enrollment update

**Risk 4: Complex Session Selection UX**
- *Issue:* Wizard could confuse students if many multi-option steps
- *Mitigation:* Clear UI copy, progress indicators, allow deferral to dashboard

## Implementation Notes

### Fully Dynamic Template Approach
Instead of requiring WordPress posts for each course, we implemented a fully dynamic template system:

1. **URL Routing:** Custom rewrite rule maps `/courses/{code}` to the template
2. **API Validation:** Template queries NestJS API to verify course exists
3. **Block Rendering:** Uses `do_blocks()` to render Course Header and Cohorts blocks directly
4. **No WP Posts Required:** Content is generated entirely from NestJS data

**Benefits:**
- Single source of truth (NestJS database)
- No data synchronization needed
- Courses appear immediately when added to API
- Consistent data across all views

**Customization Option:** Designers can still create WordPress posts for specific courses to override the default template and customize layout/content.

### Build Process
- WordPress theme uses `@wordpress/scripts` for building blocks
- Run `make watch-wp-themes` for development hot reload
- Blocks automatically register via theme's `init` hook scanning `blocks/*/block.json`
- CSS files linked in block.json are auto-enqueued by WordPress

## Related Documentation

- [Database Schema Details](./01-database-schema.md)
- [API Endpoint Specifications](./02-api-endpoints.md)
- [Course List Block Implementation](./03-course-list-block.md)
- [Course CPT and Blocks](./04-course-cpt-blocks.md)
- [Enrollment Flow Details](./05-enrollment-flow.md)
- [Student Dashboard Updates](./06-student-dashboard.md)
- [Calendar Integration](./07-calendar-integration.md)

## Future Enhancements (Out of Scope for MVP)

- Level matching recommendations ("Recommended for you")
- Prerequisites between courses
- Social proof (enrollment counts, testimonials)
- Learning outcomes and detailed curriculum
- Course reviews and ratings
- Early bird pricing tiers
- Payment plans
- Late enrollment exceptions
- Cohort chat/community features
- Certificate generation on completion
