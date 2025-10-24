# Course Programs: Simplified Implementation Roadmap

> **Status Update (November 1, 2025)**: Phases 1-2 are complete! Schema migration and entity updates are done. Ready to proceed with Phase 3.

## Overview

This roadmap reflects the **simplified architecture** that treats courses as a type of PackageAllowance within the existing package system.

**See**: [course-programs-simplified-architecture.md](course-programs-simplified-architecture.md) and [course-programs-erd.md](course-programs-erd.md) for architectural details.

---

## Prerequisites

✅ Phase 0 (Legacy cleanup) is complete
✅ Existing package-allowance system is working
✅ ServiceType.COURSE is already defined in codebase

---

## Implementation Phases

### Phase 1: Schema Migration ✅ COMPLETE

**Goal**: Extend package_allowance table and create course-specific tables

**Completed Tasks**:
1. ✅ Created migration `1763000000000-SimplifyCourseProgramSchema.ts`
2. ✅ Added `course_program_id` column to `package_allowance` with FK to `course_program`
3. ✅ Created `student_course_step_progress` table for progress tracking
4. ✅ Dropped old tables (`course_bundle_component`, `student_course_enrollment`, `student_course_progress`)
5. ✅ Removed `stripe_product_id` and `stripe_price_id` from `course_program` table
6. ✅ Migration executed successfully

**Acceptance Criteria**:
- ✅ `package_allowance.course_program_id` column exists with FK
- ✅ `student_course_step_progress` table created with correct indexes/FKs
- ✅ Old course tables dropped
- ✅ Migration rolls back cleanly
- ✅ TypeScript builds without errors

**Database Verification**:
```sql
-- ✅ Verified package_allowance has course_program_id column
-- ✅ Verified student_course_step_progress table exists
-- ✅ Verified old enrollment/progress tables are gone
-- ✅ Verified course_program no longer has Stripe fields
```

---

### Phase 2: Entity & Type Updates ✅ COMPLETE

**Goal**: Update TypeORM entities and shared types

**Completed Files**:
- ✅ `packages/entities/package-allowance.entity.ts` - Added courseProgramId field
- ✅ `packages/shared/src/types/packages.ts` - Added courseProgramId to PackageAllowance type
- ✅ `course-programs/entities/course-program.entity.ts` - Removed Stripe fields
- ✅ `course-programs/entities/course-step.entity.ts` - Updated to reference StudentCourseStepProgress
- ✅ `course-programs/entities/student-course-step-progress.entity.ts` - NEW entity created
- ✅ `course-programs/course-programs.module.ts` - Updated to use new entities/services
- ✅ `course-programs/controllers/course-programs.controller.ts` - Removed enrollment endpoints
- ✅ `entities.ts` - Updated to export StudentCourseStepProgress

**Deleted Files**:
- ✅ `course-programs/entities/course-bundle-component.entity.ts`
- ✅ `course-programs/entities/student-course-enrollment.entity.ts`
- ✅ `course-programs/entities/student-course-progress.entity.ts`
- ✅ `course-programs/services/course-enrollments.service.ts`
- ✅ `course-programs/services/course-progress.service.ts`
- ✅ `course-programs/guards/course-enrollment.guard.ts`

**Created Services**:
- ✅ `course-programs/services/course-step-progress.service.ts` - Manages progress lifecycle

**Updated Types**:
- ✅ Added `StudentCourseStepProgressSchema` and related types
- ✅ Removed obsolete enrollment and bundle component DTOs
- ✅ Updated course types to reflect new architecture

**Acceptance Criteria**:
- ✅ All entities compile without errors
- ✅ Entities exported from index.ts
- ✅ Relations defined correctly
- ✅ TypeORM can load entities
- ✅ Migration runs successfully with new entities

---

### Phase 3: Core Services ✅ COMPLETE

**Goal**: Extend package service to seed course progress on purchase

**Completed Tasks**:
1. ✅ Imported CourseProgramsModule into PaymentsModule
2. ✅ Injected CourseStepProgressService into PaymentsService
3. ✅ Added course progress seeding logic to webhook handler in `handlePackagePurchase` method
4. ✅ Updated StripeProductMap query to load allowances with relations

**Implementation**:
```typescript
// In payments.service.ts handlePackagePurchase method
// After creating StudentPackage, seed progress for COURSE allowances
if (productMapping.allowances && productMapping.allowances.length > 0) {
  const courseAllowances = productMapping.allowances.filter(
    (allowance) =>
      allowance.serviceType === ServiceType.COURSE &&
      allowance.courseProgramId,
  );

  for (const allowance of courseAllowances) {
    try {
      await this.courseStepProgressService.seedProgressForCourse(
        savedPackage.id,
        allowance.courseProgramId!,
      );
      this.logger.log(
        `Seeded course progress for package ${savedPackage.id}, course ${allowance.courseProgramId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to seed course progress for package ${savedPackage.id}, course ${allowance.courseProgramId}:`,
        error as Error,
      );
    }
  }
}
```

**Acceptance Criteria**:
- ✅ CourseStepProgressService injected into PaymentsService
- ✅ Webhook seeds progress rows for COURSE allowances on purchase
- ✅ Error handling prevents failure from blocking payment processing
- [ ] Manual testing: Create package with COURSE allowance and verify progress rows created

**Testing Guide**: See [course-programs-phase3-testing-guide.md](course-programs-phase3-testing-guide.md) for detailed testing steps.

---

### Phase 4: API Controllers (3-4 hours) 🔲 NOT STARTED

**Goal**: Ensure admin controllers support course management

**Status**: Course controllers already exist but may need updates

**Files to Review**:
- `course-programs/controllers/admin-course-programs.controller.ts` - Admin CRUD
- `course-programs/controllers/course-programs.controller.ts` - Public endpoints (already simplified)

**Public Endpoints Status** (`/course-programs`):
- ✅ `GET /` - List active courses (working)
- ✅ `GET /:id` - Get course detail (working)
- ✅ Removed `/me/enrollments` (now use `/packages/my-credits`)
- ✅ Removed `/:id/enrollment-status` (now use `/packages/my-credits`)

**Admin Endpoints to Verify** (`/admin/course-programs`):
- [ ] `POST /` - Create course program
- [ ] `GET /` - List all courses
- [ ] `GET /:id` - Get course detail
- [ ] `PUT /:id` - Update course
- [ ] `DELETE /:id` - Delete course
- [ ] `POST /:id/steps` - Create step
- [ ] `PUT /steps/:stepId` - Update step
- [ ] `DELETE /steps/:stepId` - Delete step
- [ ] `POST /steps/:stepId/options` - Attach group class
- [ ] `DELETE /steps/options/:optionId` - Detach group class

**Note**: Publishing to Stripe is now handled by packages admin UI, not course-specific endpoints

**Acceptance Criteria**:
- [ ] All CRUD endpoints work correctly
- [ ] Can create course with steps and options
- [ ] Swagger docs up to date
- [ ] Postman collection updated if needed

---

### Phase 5: Booking Integration (3-4 hours) 🔲 NOT STARTED

**Goal**: Validate course enrollment during booking and update progress

**Files to Modify**:
- `bookings/bookings.service.ts` - Add course validation and progress updates

**Implementation Strategy**:
When a student books a session that is part of a course step:
1. Validate they have a StudentPackage with a COURSE allowance for that course
2. Check StudentCourseStepProgress to ensure step is not already booked/completed
3. Create the booking (normal flow)
4. Update StudentCourseStepProgress.status to 'BOOKED' (NOT PackageUse!)

**Key Code**:
```typescript
async createBooking(studentId: number, sessionId: number, courseStepId?: number) {
  const session = await this.sessionsRepo.findOne(sessionId);

  if (session.type === ServiceType.COURSE && courseStepId) {
    // Validate enrollment
    const step = await this.courseStepsRepo.findOne(courseStepId, {
      relations: ['courseProgram']
    });

    // Find student's package with COURSE allowance for this program
    const studentPackage = await this.studentPackageRepo
      .createQueryBuilder('sp')
      .innerJoin('sp.stripeProductMap', 'spm')
      .innerJoin('spm.allowances', 'pa')
      .where('sp.studentId = :studentId', { studentId })
      .andWhere('pa.serviceType = :type', { type: ServiceType.COURSE })
      .andWhere('pa.courseProgramId = :programId', {
        programId: step.courseProgram.id
      })
      .getOne();

    if (!studentPackage) {
      throw new ForbiddenException('Not enrolled in this course');
    }

    // Check progress
    const progress = await this.stepProgressRepo.findOne({
      where: { studentPackageId: studentPackage.id, courseStepId }
    });

    if (progress.status === 'BOOKED' || progress.status === 'COMPLETED') {
      throw new BadRequestException('Step already booked or completed');
    }

    // Create booking
    const booking = await this.createBookingRecord(studentId, sessionId);

    // Update progress (NOT PackageUse!)
    await this.stepProgressRepo.update(progress.id, {
      status: 'BOOKED',
      sessionId: booking.id,
      bookedAt: new Date()
    });

    return booking;
  }

  // Regular booking (existing code)
  return this.createRegularBooking(studentId, sessionId);
}
```

**Acceptance Criteria**:
- [ ] Course bookings validate enrollment via StudentPackage
- [ ] Progress updated in StudentCourseStepProgress (status = 'BOOKED')
- [ ] No PackageUse created for course bookings
- [ ] Regular (non-course) bookings still work unchanged
- [ ] Integration tests pass
- [ ] Can't book same step twice

---

### Phase 6: Admin UI (8-10 hours) 🔲 NOT STARTED

**Goal**: Enable admins to create courses and publish them as Stripe products

**Approach**: Extend existing packages admin to support COURSE allowances

**Files to Review/Modify**:
- Check if course admin UI already exists in `wordpress/plugins/thrive-admin/`
- Extend `PackagesAdmin.vue` or similar to add COURSE allowance option

**UI Flow**:
1. Admin creates CourseProgram via admin API:
   - Code (e.g., "SFZ")
   - Title (e.g., "SFZ Foundation Course")
   - Description
   - Timezone
2. Admin adds CourseSteps with step order, labels, titles
3. Admin attaches GroupClass options to each step
4. Admin creates Stripe product via Packages UI:
   - Name: "SFZ Foundation Course"
   - Add 1 COURSE allowance (dropdown shows available courses, select by courseProgramId)
   - Optionally add PRIVATE/GROUP allowances (bonus credits)
   - Set price
   - Publish to Stripe

**Result**: Course is now a purchasable Stripe product bundled with optional credits

**Acceptance Criteria**:
- [ ] Can create/edit course programs via admin UI
- [ ] Can add/edit/delete steps
- [ ] Can attach group class options to steps
- [ ] Can create Stripe product with COURSE allowance pointing to course
- [ ] Can bundle course with PRIVATE/GROUP credits in same package
- [ ] UI is intuitive and validates inputs

---

### Phase 7: Frontend Student View (6-8 hours) 🔲 NOT STARTED

**Goal**: Display courses and progress in student-facing pages

**Files to Check/Create**:
- Course catalog page (may already exist)
- Course detail page (may already exist)
- Student dashboard course progress view

**Features Needed**:
1. **Course Catalog Page**:
   - List all active courses
   - Show course title, description, price
   - "Purchase" button (links to Stripe checkout)

2. **Course Detail Page**:
   - Show course overview
   - List all steps with titles/descriptions
   - Show available group class options per step
   - Purchase CTA if not enrolled
   - "Book Next Step" CTA if enrolled

3. **Student Dashboard - My Courses**:
   - List all courses student has purchased (via StudentPackage)
   - Show progress for each course:
     - Total steps vs completed steps
     - List of steps with status (UNBOOKED, BOOKED, COMPLETED, etc.)
   - Link to book next unbooked step

**Technical Notes**:
- Use `/api/packages/my-credits` to get student's packages (includes COURSE allowances)
- Use `/api/course-programs/:id` to get course details
- Filter packages to find those with `allowances.serviceType === 'COURSE'`
- Match `allowance.courseProgramId` to display course info

**Acceptance Criteria**:
- [ ] Course catalog displays active courses
- [ ] Course detail shows steps and options
- [ ] Purchase flow works (Stripe checkout)
- [ ] Dashboard shows enrolled courses with progress
- [ ] Can navigate to book next step
- [ ] Mobile responsive
- [ ] Loading states and error handling

---

### Phase 8: Shared Types & DTOs (2 hours) ✅ MOSTLY COMPLETE

**Status**: Most obsolete types already removed during Phase 2

**Remaining Cleanup**:
- [ ] Review `packages/shared/src/types/course-programs.ts` for any remaining unused types
- [ ] Ensure all exported types are documented
- [ ] Update any frontend imports that reference old types

**Current Status**:
- ✅ Removed `EnrollmentStatusSchema`
- ✅ Removed obsolete enrollment DTOs
- ✅ Added `StudentCourseStepProgressSchema`
- ✅ Added `CourseStepProgressViewSchema`
- ✅ Added `StudentCoursePackageSchema`

**Acceptance Criteria**:
- [ ] No unused types in shared package
- [ ] All types properly documented
- [ ] Frontend can import all needed types
- [ ] TypeScript builds without errors

---

### Phase 9: Testing & QA (4-6 hours) 🔲 NOT STARTED

**Tests to Write**:
1. Unit tests for new services
2. Integration tests for course booking flow
3. E2E test: Create course → Purchase → Book steps → Track progress

**Manual QA**:
1. Create course with 4 steps
2. Attach group classes to each step
3. Create Stripe product bundling course + private credits
4. Student purchases course
5. Verify progress seeded
6. Student books step 1
7. Verify progress updated (not PackageUse)
8. Student uses bonus private credit
9. Verify PackageUse created

**Acceptance Criteria**:
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E test passes
- [ ] Manual QA checklist complete

---

## Timeline Summary

| Phase | Description | Time Estimate | Status |
|-------|-------------|---------------|--------|
| 1 | Schema Migration | 2-3 hours | ✅ COMPLETE |
| 2 | Entity & Type Updates | 2-3 hours | ✅ COMPLETE |
| 3 | Core Services | 4-6 hours | ⏳ IN PROGRESS |
| 4 | API Controllers | 3-4 hours | 🔲 NOT STARTED |
| 5 | Booking Integration | 3-4 hours | 🔲 NOT STARTED |
| 6 | Admin UI | 8-10 hours | 🔲 NOT STARTED |
| 7 | Frontend Student View | 6-8 hours | 🔲 NOT STARTED |
| 8 | Shared Types & DTOs | 2 hours | ✅ MOSTLY COMPLETE |
| 9 | Testing & QA | 4-6 hours | 🔲 NOT STARTED |
| **TOTAL** | **Full Implementation** | **34-48 hours** | **~20% Complete** |

**Time Completed**: ~5-6 hours  
**Time Remaining**: ~28-42 hours  
**Estimated**: 3-4 days remaining for one developer

---

## What Has Been Completed

### ✅ Phase 1 & 2 Summary
1. **Migration executed successfully**:
   - Added `course_program_id` to `package_allowance`
   - Created `student_course_step_progress` table
   - Dropped 3 obsolete tables
   - Removed Stripe fields from `course_program`

2. **Entities updated**:
   - `PackageAllowance` now supports `courseProgramId`
   - New `StudentCourseStepProgress` entity created
   - Old enrollment/progress entities deleted
   - Course module cleaned up

3. **Services created**:
   - `CourseStepProgressService` with full CRUD and validation
   - Old enrollment/progress services removed

4. **Types updated**:
   - Shared types reflect new architecture
   - Obsolete DTOs removed
   - New progress types added

### 🎯 Next Immediate Steps (Phase 3)

1. **Inject CourseStepProgressService into PackagesService**:
   ```typescript
   // In packages.module.ts
   imports: [CourseProgramsModule], // Add this
   
   // In packages.service.ts constructor
   constructor(
     // ... existing injections
     private readonly courseStepProgressService: CourseStepProgressService,
   ) {}
   ```

2. **Update Stripe webhook handler**:
   ```typescript
   async handlePurchaseSuccess(session: Stripe.Checkout.Session) {
     // ... existing StudentPackage creation code ...
     
     // Add course progress seeding
     const courseAllowances = studentPackage.stripeProductMap.allowances
       .filter(a => a.serviceType === ServiceType.COURSE && a.courseProgramId);
     
     for (const allowance of courseAllowances) {
       await this.courseStepProgressService.seedProgressForCourse(
         studentPackage.id,
         allowance.courseProgramId
       );
     }
   }
   ```

3. **Test the integration**:
   - Create a test course program via admin API
   - Create a Stripe product with COURSE allowance
   - Purchase it and verify progress rows are seeded

---

## What's Different from Original Plan?

### ✅ Completed Simplifications
- ✅ No `CourseBundleComponent` entity (deleted)
- ✅ No `StudentCourseEnrollment` entity (deleted)
- ✅ No `StudentCourseProgress` entity (replaced with StudentCourseStepProgress)
- ✅ No enrollment service (deleted)
- ✅ No course-enrollment guard (deleted)
- ✅ No Stripe fields in CourseProgram entity
- ✅ Simplified CoursePrograms controller (removed enrollment endpoints)

### Leverages Existing Systems
- ✅ Uses `PackageAllowance` for course access (courseProgramId field added)
- ✅ Uses `StudentPackage` for purchases (no changes needed)
- ✅ Uses existing Stripe webhook (needs extension in Phase 3)
- ⏳ Uses existing package admin UI (Phase 6)
- ✅ Uses existing credit tier system (ServiceType.COURSE = tier 0)

### New (Minimal) Additions
- ✅ `StudentCourseStepProgress` for step-by-step tracking
- ✅ `CourseStepProgressService` for progress management
- ⏳ Small extension to package webhook (Phase 3)
- ⏳ Course validation in booking service (Phase 5)

---

## Key Files Changed

### Created ✨
- `migrations/1763000000000-SimplifyCourseProgramSchema.ts`
- `course-programs/entities/student-course-step-progress.entity.ts`
- `course-programs/services/course-step-progress.service.ts`

### Modified 📝
- `packages/entities/package-allowance.entity.ts`
- `course-programs/entities/course-program.entity.ts`
- `course-programs/entities/course-step.entity.ts`
- `course-programs/controllers/course-programs.controller.ts`
- `course-programs/course-programs.module.ts`
- `packages/shared/src/types/packages.ts`
- `packages/shared/src/types/course-programs.ts`
- `entities.ts`
- `migrations/index.ts`

### Deleted 🗑️
- `course-programs/entities/course-bundle-component.entity.ts`
- `course-programs/entities/student-course-enrollment.entity.ts`
- `course-programs/entities/student-course-progress.entity.ts`
- `course-programs/services/course-enrollments.service.ts`
- `course-programs/services/course-progress.service.ts`
- `course-programs/guards/course-enrollment.guard.ts`

---

## Architecture Diagram (Current State)

```
┌──────────────────────────────────────────────────────────┐
│                   STRIPE PRODUCT                          │
│              (e.g., "SFZ Foundation Course")              │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│              StripeProductMap ✅                          │
│   serviceKey: "course_sfz_foundation"                     │
│   scopeType: COURSE, scopeId: 42                          │
└───────────────────────┬──────────────────────────────────┘
                        │
                        │ Has multiple allowances
                        ▼
        ┌───────────────┼───────────────┬──────────────┐
        │               │               │              │
        ▼               ▼               ▼              ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ COURSE  │    │ PRIVATE │    │ PRIVATE │    │  GROUP  │
   │Allowance│    │Allowance│    │Allowance│    │Allowance│
   │ ✅      │    │   #1    │    │   #2    │    │   #3    │
   │courseId:│    │ 30 min  │    │ 30 min  │    │ 60 min  │
   │   42    │    └─────────┘    └─────────┘    └─────────┘
   └────┬────┘
        │
        │ References
        ▼
   ┌─────────────────┐
   │  CourseProgram  │
   │    (id: 42) ✅  │
   │  ┌──────────┐   │
   │  │ Step 1   │   │
   │  │ Step 2   │   │
   │  │ Step 3   │   │
   │  │ Step 4   │   │
   │  └──────────┘   │
   └─────────────────┘

                STUDENT PURCHASES ✅
                       ↓
        ┌──────────────────────────────────────┐
        │        StudentPackage ✅              │
        │  (Links Student + StripeProductMap)  │
        └──────────────┬───────────────────────┘
                       │
                       │ ⏳ Phase 3: Seeds progress on purchase
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────────┐    ┌──────────────────────┐
│StudentCourseStep     │    │    PackageUse        │
│    Progress ✅       │    │  (When PRIVATE or    │
│ (For COURSE steps)   │    │   GROUP allowance    │
│                      │    │   is consumed)       │
│ Step 1: UNBOOKED ⏳  │    │                      │
│ Step 2: UNBOOKED     │    │ Used allowance #1    │
│ Step 3: UNBOOKED     │    │ Used allowance #3    │
│ Step 4: UNBOOKED     │    │ ...                  │
└──────────────────────┘    └──────────────────────┘

✅ = Implemented
⏳ = In Progress
🔲 = Not Started
```

---

## Rollout Plan

### Development
1. Create feature branch: `feature/course-programs-simplified`
2. Implement phases 1-9 sequentially
3. Run tests after each phase
4. Create PR when complete

### Staging
1. Deploy to staging
2. Run full test suite
3. Create test course
4. Test purchase flow
5. Verify Stripe webhook

### Production
1. Run migrations
2. Deploy code
3. Create first course
4. Monitor logs
5. Announce feature

---

## Success Criteria

The simplified course feature is complete when:

1. ✅ Admins can create course programs with steps
2. ✅ Admins can create Stripe products with COURSE allowances
3. ✅ Students can purchase courses (same flow as packages)
4. ✅ Progress seeded automatically on purchase
5. ✅ Students can book course steps
6. ✅ Progress tracked in `StudentCourseStepProgress`
7. ✅ Course bookings don't consume PackageUse credits
8. ✅ Bonus credits work (PRIVATE/GROUP allowances)
9. ✅ Dashboard shows course progress
10. ✅ All tests pass
11. ✅ Documentation complete

**Simplified = Less code, same features!** 🚀
