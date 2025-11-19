# Course Step Session Booking - Consolidation & Improvement Plan

**Status:** Planning
**Priority:** High
**Effort:** Large (3-5 days)
**Created:** 2025-11-09

---

## Executive Summary

The course step session booking system currently operates as a separate, parallel booking mechanism alongside the platform's standard booking system. This creates technical debt, inconsistent UX, and limits future extensibility. This document outlines a comprehensive plan to consolidate the two systems while preserving course-specific functionality.

### Current State Problems

1. **Dual Booking Systems** - Course bookings use `StudentCourseStepProgress` status tracking instead of creating `Booking` entities
2. **Data Integrity Issues** - Stores `GroupClass.id` instead of `Session.id`, preventing accurate session tracking
3. **Missing Functionality** - Change-session endpoint doesn't exist; auto-refresh doesn't work
4. **Architecture Violations** - Raw fetch calls instead of ThriveClient; scattered type definitions
5. **Limited Extensibility** - Cannot leverage existing booking features (cancellations, waitlists, notifications)

### Proposed Solution

Unify course step bookings with the standard booking system while maintaining course-specific progress tracking through a linked relationship model.

---

## Architecture Overview

### Current Architecture (Before)

```
Student selects session
        ↓
CourseStepBookingModal (raw fetch)
        ↓
POST /course-packages/:id/book-sessions
        ↓
CourseStepProgressService.bookSessions()
        ↓
UPDATE StudentCourseStepProgress
   - status = 'BOOKED'
   - sessionId = groupClassId ❌
   - bookedAt = now()

[No Booking entity created]
```

### Proposed Architecture (After)

```
Student selects session
        ↓
CourseStepBookingModal (via ThriveClient)
        ↓
POST /course-packages/:id/book-step-session
        ↓
CourseStepBookingService.bookStepSession()
        ↓
Transaction:
  1. Create Booking entity
     - sessionId = actual Session.id ✓
     - bookingType = 'COURSE_STEP'
     - status = 'CONFIRMED'
     - metadata = { courseStepId, stepOrder }

  2. Update StudentCourseStepProgress
     - status = 'BOOKED'
     - bookingId = new booking FK ✓
     - bookedAt = now()

  3. Send confirmation email (via BookingService)

  4. Emit booking event

Response includes booking + progress data
        ↓
Auto-refresh enrollment list
```

---

## Implementation Plan

### Phase 1: Database & Entity Layer (1 day)

#### 1.1 Update Booking Entity
**File:** `apps/nestjs/src/bookings/entities/booking.entity.ts`

**Changes:**
- Add `bookingType` enum field: `'DROP_IN' | 'COURSE_STEP' | 'WORKSHOP'`
- Add `courseStepId` nullable FK to CourseStep
- Add `studentPackageId` nullable FK to StudentPackage
- Add `metadata` JSONB field for extensibility

```typescript
@Column({
  type: 'enum',
  enum: ['DROP_IN', 'COURSE_STEP', 'WORKSHOP'],
  default: 'DROP_IN'
})
bookingType: 'DROP_IN' | 'COURSE_STEP' | 'WORKSHOP';

@Column({ nullable: true })
courseStepId: number;

@ManyToOne(() => CourseStep, { nullable: true })
@JoinColumn({ name: 'courseStepId' })
courseStep: CourseStep;

@Column({ nullable: true })
studentPackageId: number;

@ManyToOne(() => StudentPackage, { nullable: true })
@JoinColumn({ name: 'studentPackageId' })
studentPackage: StudentPackage;

@Column('jsonb', { nullable: true })
metadata: Record<string, any>;
```

#### 1.2 Update StudentCourseStepProgress Entity
**File:** `apps/nestjs/src/course-programs/entities/student-course-step-progress.entity.ts`

**Changes:**
- Rename `sessionId` to `groupClassId` (semantic clarity)
- Add `bookingId` FK to Booking entity

```typescript
// Keep for reference but don't use for booking tracking
@Column({ nullable: true })
groupClassId: number;

// New: Link to actual booking
@Column({ nullable: true })
bookingId: number;

@ManyToOne(() => Booking, { nullable: true })
@JoinColumn({ name: 'bookingId' })
booking: Booking;
```

#### 1.3 Create Migration
**File:** `apps/nestjs/src/migrations/{timestamp}-consolidate-course-bookings.ts`

**Tasks:**
1. Add `bookingType`, `courseStepId`, `studentPackageId`, `metadata` to `booking` table
2. Rename `sessionId` → `groupClassId` in `student_course_step_progress`
3. Add `bookingId` FK to `student_course_step_progress`
4. Backfill: Create Booking records for existing BOOKED progress records (if any)
5. Set bookingId references for backfilled records

---

### Phase 2: Backend Service Layer (1.5 days)

#### 2.1 Create CourseStepBookingService
**File:** `apps/nestjs/src/course-programs/services/course-step-booking.service.ts` (NEW)

**Purpose:** Dedicated service for course step session booking logic

**Methods:**

```typescript
class CourseStepBookingService {
  // Get available sessions for a specific step
  async getAvailableSessionsForStep(
    studentId: number,
    packageId: number,
    stepId: number
  ): Promise<AvailableSessionOption[]>

  // Book a single step session
  async bookStepSession(
    studentId: number,
    packageId: number,
    stepId: number,
    courseStepOptionId: number
  ): Promise<{ booking: Booking; progress: StudentCourseStepProgress }>

  // Change an existing step session booking
  async changeStepSession(
    studentId: number,
    packageId: number,
    stepId: number,
    newCourseStepOptionId: number
  ): Promise<{ booking: Booking; progress: StudentCourseStepProgress }>

  // Bulk book sessions (for post-purchase wizard)
  async bulkBookStepSessions(
    studentId: number,
    packageId: number,
    selections: { courseStepId: number; courseStepOptionId: number }[]
  ): Promise<{
    bookings: Booking[];
    progress: StudentCourseStepProgress[];
    autoBooked: number[];
    manualSelections: number[];
  }>

  // Cancel a step booking (updates progress + booking)
  async cancelStepBooking(
    studentId: number,
    packageId: number,
    stepId: number,
    reason?: string
  ): Promise<void>
}
```

**Implementation Details:**

**bookStepSession():**
```typescript
async bookStepSession(
  studentId: number,
  packageId: number,
  stepId: number,
  courseStepOptionId: number
): Promise<{ booking: Booking; progress: StudentCourseStepProgress }> {
  return this.dataSource.transaction(async (manager) => {
    // 1. Validate package ownership
    const studentPackage = await this.validatePackageOwnership(studentId, packageId, manager);

    // 2. Get progress record
    const progress = await manager.findOne(StudentCourseStepProgress, {
      where: { studentPackageId: packageId, courseStepId: stepId }
    });

    if (!progress || progress.status !== 'UNBOOKED') {
      throw new BadRequestException('Step already booked or invalid');
    }

    // 3. Get session details from option
    const option = await manager.findOne(CourseStepOption, {
      where: { id: courseStepOptionId, courseStepId: stepId },
      relations: ['groupClass', 'groupClass.sessions']
    });

    if (!option || !option.isActive) {
      throw new BadRequestException('Invalid session option');
    }

    // 4. Find the specific Session instance (not just group class)
    // Get session from cohort session mapping
    const cohortSession = await manager.findOne(CourseCohortSession, {
      where: {
        cohortId: studentPackage.cohortId,
        courseStepOptionId: option.id
      },
      relations: ['courseStepOption.groupClass.sessions']
    });

    // Get the actual next session instance
    const session = await this.findNextAvailableSession(
      option.groupClass.id,
      manager
    );

    if (!session) {
      throw new BadRequestException('No available sessions');
    }

    // 5. Check capacity using BookingService
    const hasCapacity = await this.bookingService.checkCapacity(session.id, manager);
    if (!hasCapacity) {
      throw new BadRequestException('Session is full');
    }

    // 6. Create Booking entity
    const booking = manager.create(Booking, {
      userId: studentPackage.userId,
      sessionId: session.id,
      bookingType: 'COURSE_STEP',
      status: 'CONFIRMED',
      courseStepId: stepId,
      studentPackageId: packageId,
      metadata: {
        stepOrder: progress.stepOrder,
        stepLabel: progress.courseStep?.label,
        packageName: studentPackage.packageName
      },
      createdBy: studentId,
      paymentStatus: 'PAID' // Already paid via package purchase
    });

    await manager.save(Booking, booking);

    // 7. Update progress record
    progress.status = 'BOOKED';
    progress.bookingId = booking.id;
    progress.groupClassId = option.groupClassId;
    progress.bookedAt = new Date();

    await manager.save(StudentCourseStepProgress, progress);

    // 8. Send confirmation email
    await this.emailService.sendCourseStepBookingConfirmation(
      studentPackage.userId,
      booking,
      progress
    );

    // 9. Emit event for tracking
    this.eventEmitter.emit('course.step.booked', {
      studentId,
      packageId,
      stepId,
      bookingId: booking.id
    });

    return { booking, progress };
  });
}
```

**changeStepSession():**
```typescript
async changeStepSession(
  studentId: number,
  packageId: number,
  stepId: number,
  newCourseStepOptionId: number
): Promise<{ booking: Booking; progress: StudentCourseStepProgress }> {
  return this.dataSource.transaction(async (manager) => {
    // 1. Get existing progress
    const progress = await manager.findOne(StudentCourseStepProgress, {
      where: { studentPackageId: packageId, courseStepId: stepId },
      relations: ['booking']
    });

    if (!progress || progress.status !== 'BOOKED' || !progress.booking) {
      throw new BadRequestException('No existing booking to change');
    }

    // 2. Check if change is allowed (e.g., not too close to session time)
    const cancellationWindow = 24; // hours
    const sessionStartTime = progress.booking.session.startAt;
    const hoursUntilSession = (sessionStartTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilSession < cancellationWindow) {
      throw new BadRequestException(
        `Cannot change booking within ${cancellationWindow} hours of session`
      );
    }

    // 3. Cancel old booking (using BookingService)
    await this.bookingService.cancelBooking(
      progress.booking.id,
      studentId,
      'Student changed to different session',
      manager
    );

    // 4. Book new session (reuse bookStepSession logic)
    return this.bookStepSession(studentId, packageId, stepId, newCourseStepOptionId);
  });
}
```

#### 2.2 Refactor CourseStepProgressService
**File:** `apps/nestjs/src/course-programs/services/course-step-progress.service.ts`

**Changes:**
- Keep `getUnbookedSteps()` method (still needed for fetching available options)
- **Remove** `bookSessions()` method (replaced by CourseStepBookingService)
- Update `getUnbookedSteps()` to return actual Session IDs, not just GroupClass IDs
- Add `getBookedSessionDetails()` helper to fetch booking info

#### 2.3 Update Controllers

**File:** `apps/nestjs/src/students/controllers/student-packages.controller.ts`

**Replace:**
```typescript
// OLD
@Post(':packageId/book-sessions')
async bookSessions(
  @Param('packageId', ParseIntPipe) packageId: number,
  @CurrentUser() user: RequestUser,
  @Body() dto: BookSessionsDto,
) {
  return this.courseStepProgressService.bookSessions(
    user.userId,
    packageId,
    dto.selections,
  );
}
```

**With:**
```typescript
// NEW - Single step booking
@Post(':packageId/steps/:stepId/book-session')
async bookStepSession(
  @Param('packageId', ParseIntPipe) packageId: number,
  @Param('stepId', ParseIntPipe) stepId: number,
  @CurrentUser() user: RequestUser,
  @Body() dto: BookStepSessionDto,
) {
  return this.courseStepBookingService.bookStepSession(
    user.userId,
    packageId,
    stepId,
    dto.courseStepOptionId,
  );
}

// NEW - Bulk booking (for post-purchase wizard)
@Post(':packageId/book-sessions')
async bulkBookStepSessions(
  @Param('packageId', ParseIntPipe) packageId: number,
  @CurrentUser() user: RequestUser,
  @Body() dto: BulkBookSessionsDto,
) {
  return this.courseStepBookingService.bulkBookStepSessions(
    user.userId,
    packageId,
    dto.selections,
  );
}

// NEW - Change session
@Post(':packageId/steps/:stepId/change-session')
async changeStepSession(
  @Param('packageId', ParseIntPipe) packageId: number,
  @Param('stepId', ParseIntPipe) stepId: number,
  @CurrentUser() user: RequestUser,
  @Body() dto: ChangeStepSessionDto,
) {
  return this.courseStepBookingService.changeStepSession(
    user.userId,
    packageId,
    stepId,
    dto.courseStepOptionId,
  );
}

// NEW - Cancel booking
@Delete(':packageId/steps/:stepId/booking')
async cancelStepBooking(
  @Param('packageId', ParseIntPipe) packageId: number,
  @Param('stepId', ParseIntPipe) stepId: number,
  @CurrentUser() user: RequestUser,
  @Body() dto: CancelStepBookingDto,
) {
  await this.courseStepBookingService.cancelStepBooking(
    user.userId,
    packageId,
    stepId,
    dto.reason,
  );
  return { success: true };
}
```

#### 2.4 Create DTOs
**File:** `apps/nestjs/src/course-programs/dto/book-step-session.dto.ts` (NEW)

```typescript
export class BookStepSessionDto {
  @IsNumber()
  courseStepOptionId: number;
}

export class ChangeStepSessionDto {
  @IsNumber()
  courseStepOptionId: number;
}

export class BulkBookSessionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepSelectionDto)
  selections: StepSelectionDto[];
}

class StepSelectionDto {
  @IsNumber()
  courseStepId: number;

  @IsNumber()
  courseStepOptionId: number;
}

export class CancelStepBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
```

---

### Phase 3: Shared Types (0.5 days)

#### 3.1 Create Course Booking Types
**File:** `packages/shared/src/types/course-bookings.ts` (NEW)

```typescript
import { BookingStatus } from './bookings';

// Available session option for a course step
export interface CourseStepSessionOption {
  courseStepOptionId: number;
  sessionId: number;  // Actual Session.id
  groupClassId: number;
  groupClassName: string;
  startAt: string;
  endAt: string;
  capacityMax: number;
  spotsAvailable: number;
  isActive: boolean;
  teacherName: string;
}

// Step with available session options
export interface UnbookedCourseStep {
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  stepOrder: number;
  isRequired: boolean;
  options: CourseStepSessionOption[];
}

// Booking response for course step
export interface CourseStepBookingResponse {
  booking: {
    id: number;
    sessionId: number;
    status: BookingStatus;
    bookingType: 'COURSE_STEP';
    createdAt: string;
  };
  progress: {
    id: number;
    courseStepId: number;
    status: 'BOOKED';
    bookingId: number;
    bookedAt: string;
  };
}

// Bulk booking response
export interface BulkCourseStepBookingResponse {
  bookings: CourseStepBookingResponse[];
  autoBooked: number[];  // Step IDs auto-booked
  manualSelections: number[];  // Step IDs manually selected
}

// Change session request
export interface ChangeStepSessionRequest {
  courseStepOptionId: number;
}

// Cancel booking request
export interface CancelStepBookingRequest {
  reason?: string;
}
```

#### 3.2 Update Existing Types
**File:** `packages/shared/src/types/bookings.ts`

```typescript
// Add to BookingType
export type BookingType = 'DROP_IN' | 'COURSE_STEP' | 'WORKSHOP';

// Update BookingResponse to include courseStepId
export interface BookingResponse {
  id: number;
  sessionId: number;
  status: BookingStatus;
  bookingType: BookingType;
  courseStepId?: number;  // NEW
  studentPackageId?: number;  // NEW
  metadata?: Record<string, any>;  // NEW
  // ... existing fields
}
```

#### 3.3 Export from Index
**File:** `packages/shared/src/types/index.ts`

```typescript
export * from './course-bookings';
```

---

### Phase 4: ThriveClient Integration (0.5 days)

#### 4.1 Add Course Booking Methods
**File:** `apps/wordpress/shared/thrive.ts`

```typescript
// Add to thriveClient object

// Get unbooked steps with available session options
getUnbookedCourseSteps: async (packageId: number): Promise<UnbookedCourseStep[]> => {
  const response = await fetch(
    `${apiUrl}/students/me/course-packages/${packageId}/unbooked-steps`,
    {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch unbooked steps');
  }

  return response.json();
},

// Book a single step session
bookCourseStepSession: async (
  packageId: number,
  stepId: number,
  courseStepOptionId: number
): Promise<CourseStepBookingResponse> => {
  const response = await fetch(
    `${apiUrl}/students/me/course-packages/${packageId}/steps/${stepId}/book-session`,
    {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ courseStepOptionId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to book session');
  }

  return response.json();
},

// Change an existing step session
changeCourseStepSession: async (
  packageId: number,
  stepId: number,
  courseStepOptionId: number
): Promise<CourseStepBookingResponse> => {
  const response = await fetch(
    `${apiUrl}/students/me/course-packages/${packageId}/steps/${stepId}/change-session`,
    {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ courseStepOptionId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to change session');
  }

  return response.json();
},

// Bulk book sessions (post-purchase wizard)
bulkBookCourseStepSessions: async (
  packageId: number,
  selections: { courseStepId: number; courseStepOptionId: number }[]
): Promise<BulkCourseStepBookingResponse> => {
  const response = await fetch(
    `${apiUrl}/students/me/course-packages/${packageId}/book-sessions`,
    {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ selections }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to book sessions');
  }

  return response.json();
},

// Cancel step booking
cancelCourseStepBooking: async (
  packageId: number,
  stepId: number,
  reason?: string
): Promise<void> => {
  const response = await fetch(
    `${apiUrl}/students/me/course-packages/${packageId}/steps/${stepId}/booking`,
    {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ reason }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to cancel booking');
  }
},
```

---

### Phase 5: Frontend Refactor (1 day)

#### 5.1 Refactor CourseStepBookingModal
**File:** `apps/wordpress/themes/custom-theme/blocks/selected-event-modal/components/CourseStepBookingModal.tsx`

**Changes:**
- Remove inline type definitions (use types from `@thrive/shared`)
- Replace raw `fetch()` calls with ThriveClient methods
- Implement proper error handling with user-friendly messages
- Add loading states

**Before:**
```typescript
// Inline types
interface SessionOption {
  courseStepOptionId: number;
  // ...
}

// Raw fetch
const response = await fetch(`/api/students/me/course-packages/${packageId}/unbooked-steps`);
const data = await response.json();
```

**After:**
```typescript
import { UnbookedCourseStep, CourseStepSessionOption } from '@thrive/shared';
import { thriveClient } from '../../../../shared/thrive';

// Type-safe fetch
const unbookedSteps = await thriveClient.getUnbookedCourseSteps(packageId);

// Type-safe booking
if (isModifying) {
  await thriveClient.changeCourseStepSession(packageId, stepId, selectedOptionId);
} else {
  await thriveClient.bookCourseStepSession(packageId, stepId, selectedOptionId);
}
```

#### 5.2 Add Auto-Refresh Listener
**File:** `apps/wordpress/themes/custom-theme/blocks/student-course-enrollments/StudentCourseEnrollments.tsx`

**Add useEffect to listen for booking events:**

```typescript
useEffect(() => {
  const handleStepBooked = (event: CustomEvent) => {
    const { packageId: bookedPackageId } = event.detail;

    // Refetch enrollments to show updated status
    refetch();

    // Or update state directly if you have the package data
    setEnrollments((prev) =>
      prev.map((enrollment) =>
        enrollment.id === bookedPackageId
          ? { ...enrollment, needsRefresh: true }
          : enrollment
      )
    );
  };

  window.addEventListener('thrive-course:stepBooked', handleStepBooked as EventListener);

  return () => {
    window.removeEventListener('thrive-course:stepBooked', handleStepBooked as EventListener);
  };
}, [refetch]);
```

#### 5.3 Refactor SessionSelectionWizard
**File:** `apps/wordpress/themes/custom-theme/blocks/session-selection-wizard/components/SessionSelectionWizard.tsx`

**Changes:**
- Use ThriveClient instead of raw fetch
- Use shared types
- Update to use new bulk booking endpoint

**Replace:**
```typescript
const response = await fetch(
  `/api/students/me/course-packages/${packageId}/book-sessions`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selections }),
  }
);
```

**With:**
```typescript
const result = await thriveClient.bulkBookCourseStepSessions(
  packageId,
  selections
);
```

#### 5.4 Update Event Detail Types
**File:** `apps/wordpress/themes/custom-theme/blocks/types/events.ts` (NEW)

```typescript
// Custom event type definitions
export interface CourseStepBookedEventDetail {
  packageId: number;
  stepId: number;
  success: boolean;
  bookingId?: number;
}

export interface CourseBookStepEventDetail {
  packageId: number;
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  isModifying: boolean;
}

// Type-safe event dispatching
export function dispatchCourseStepBooked(detail: CourseStepBookedEventDetail) {
  window.dispatchEvent(
    new CustomEvent('thrive-course:stepBooked', { detail })
  );
}

export function dispatchBookStep(detail: CourseBookStepEventDetail) {
  window.dispatchEvent(
    new CustomEvent('thrive-course:bookStep', { detail })
  );
}
```

---

### Phase 6: Testing & Validation (0.5 days)

#### 6.1 Backend Unit Tests
**File:** `apps/nestjs/src/course-programs/services/course-step-booking.service.spec.ts` (NEW)

**Test Cases:**
- [ ] `bookStepSession` creates Booking entity with correct fields
- [ ] `bookStepSession` updates StudentCourseStepProgress with bookingId
- [ ] `bookStepSession` stores correct Session.id (not GroupClass.id)
- [ ] `bookStepSession` respects capacity limits
- [ ] `bookStepSession` sends confirmation email
- [ ] `changeStepSession` cancels old booking before creating new one
- [ ] `changeStepSession` enforces cancellation window
- [ ] `bulkBookStepSessions` handles mixed auto/manual selections
- [ ] `cancelStepBooking` updates both Booking and Progress entities
- [ ] Transaction rollback on failure

#### 6.2 Integration Tests
**File:** `apps/nestjs/test/course-step-booking.e2e-spec.ts` (NEW)

**Test Scenarios:**
- [ ] Complete booking flow: fetch options → book → verify booking created
- [ ] Change session flow: book → change → verify old cancelled, new created
- [ ] Bulk booking after purchase
- [ ] Capacity enforcement prevents overbooking
- [ ] Authorization: students can only book their own packages
- [ ] Error handling: invalid step, full session, already booked

#### 6.3 Frontend Tests
**File:** `apps/wordpress/themes/custom-theme/blocks/selected-event-modal/components/CourseStepBookingModal.test.tsx`

**Test Cases:**
- [ ] Fetches and displays available session options
- [ ] Auto-selects when only one option available
- [ ] Submits booking with correct payload
- [ ] Shows loading states during API calls
- [ ] Displays error messages on failure
- [ ] Dispatches success event after booking
- [ ] Uses ThriveClient methods (not raw fetch)

#### 6.4 Manual Testing Checklist
- [ ] Book a new course step session
- [ ] Change an existing session booking
- [ ] Verify Booking entity created in database
- [ ] Verify correct Session.id stored (not GroupClass.id)
- [ ] Confirm enrollment list auto-refreshes after booking
- [ ] Test capacity limits (book until full)
- [ ] Test cancellation window enforcement
- [ ] Verify confirmation email sent
- [ ] Test bulk booking in post-purchase wizard
- [ ] Verify existing bookings still work after migration

---

### Phase 7: Documentation & Cleanup (0.5 days)

#### 7.1 Update API Documentation
**File:** `docs/course-student-view/02-api-endpoints.md`

**Updates:**
- Document new booking endpoints
- Add request/response examples
- Document error codes
- Update authentication requirements
- Mark old `book-sessions` endpoint as deprecated or update its purpose

#### 7.2 Update Architecture Docs
**File:** `CLAUDE.md`

**Updates:**
- Document unified booking system
- Update runtime contracts section
- Add course step booking flow diagram
- Reference new CourseStepBookingService

**File:** `.github/instructions/nestjs.instructions.md`

**Updates:**
- Add CourseStepBookingService to services list
- Document booking type patterns
- Add transaction patterns for booking operations

#### 7.3 Create Migration Guide
**File:** `docs/course-student-view/04-booking-migration-guide.md` (NEW)

**Content:**
- Breaking changes summary
- Data migration steps
- Rollback procedures
- Testing verification steps

#### 7.4 Remove Deprecated Code
- [ ] Remove old `bookSessions()` method from CourseStepProgressService (if fully replaced)
- [ ] Remove inline type definitions from components
- [ ] Remove commented-out code
- [ ] Update imports across codebase

---

## Database Migration Strategy

### Safe Migration Path

**Goal:** Migrate existing BOOKED progress records to have proper Booking entities without downtime.

**Steps:**

1. **Deploy Phase 1:** Add new columns but keep old logic working
   - Add `bookingType`, `courseStepId`, etc. to `booking` table
   - Add `bookingId` to `student_course_step_progress` table
   - Keep existing `groupClassId` column
   - Deploy migration, no code changes yet

2. **Backfill Data:** Create Booking records for existing bookings
   ```sql
   -- For each BOOKED progress record without a bookingId
   INSERT INTO booking (
     userId, sessionId, bookingType, status,
     courseStepId, studentPackageId, createdAt, paymentStatus
   )
   SELECT
     sp.userId,
     -- Find next session for the group class
     (SELECT id FROM session WHERE groupClassId = scsp.groupClassId
      AND startAt > NOW() ORDER BY startAt LIMIT 1),
     'COURSE_STEP',
     'CONFIRMED',
     scsp.courseStepId,
     scsp.studentPackageId,
     scsp.bookedAt,
     'PAID'
   FROM student_course_step_progress scsp
   JOIN student_package sp ON scsp.studentPackageId = sp.id
   WHERE scsp.status = 'BOOKED'
     AND scsp.bookingId IS NULL
     AND scsp.groupClassId IS NOT NULL;

   -- Update progress records with new bookingId
   UPDATE student_course_step_progress scsp
   SET bookingId = b.id
   FROM booking b
   WHERE scsp.courseStepId = b.courseStepId
     AND scsp.studentPackageId = b.studentPackageId
     AND scsp.bookingId IS NULL
     AND b.bookingType = 'COURSE_STEP';
   ```

3. **Deploy Phase 2:** Deploy new service layer
   - Deploy CourseStepBookingService
   - Deploy new controller endpoints
   - Old endpoints still work (for compatibility)

4. **Deploy Phase 3:** Deploy frontend changes
   - Deploy ThriveClient methods
   - Deploy updated components
   - Test in production with real users

5. **Monitor & Verify:**
   - Check logs for errors
   - Verify new bookings create proper entities
   - Verify capacity tracking works correctly

6. **Cleanup:** After 1-2 weeks of stable operation
   - Remove deprecated endpoints (if any)
   - Remove old code paths

---

## Rollback Plan

If issues are discovered after deployment:

### Immediate Rollback (< 24 hours)
1. Revert frontend deployment (components use old endpoints)
2. Revert backend service deployment (restore old bookSessions method)
3. Database changes remain (backward compatible)

### Post-Migration Rollback (> 24 hours)
1. Cannot easily rollback database (new Booking records exist)
2. Keep new architecture but fix bugs in place
3. Manual data correction if needed

### Rollback Prevention
- Thorough testing in staging environment
- Gradual rollout (feature flag if possible)
- Monitor error rates and user reports
- Keep old endpoints working for 1-2 weeks

---

## Success Criteria

### Technical Metrics
- [ ] All course step bookings create Booking entities
- [ ] Session.id (not GroupClass.id) stored in all new bookings
- [ ] Zero raw fetch calls for booking operations (all use ThriveClient)
- [ ] All types imported from `@thrive/shared`
- [ ] 100% test coverage for CourseStepBookingService
- [ ] No database constraint violations
- [ ] Transaction success rate > 99.9%

### User Experience Metrics
- [ ] Enrollment list auto-refreshes after booking
- [ ] Confirmation emails sent for all bookings
- [ ] Session changes work without manual page refresh
- [ ] Error messages are user-friendly
- [ ] Loading states prevent double-submissions
- [ ] No reported booking failures

### Code Quality Metrics
- [ ] TypeScript strict mode passes
- [ ] No `any` types in new code
- [ ] All TODOs resolved or ticketed
- [ ] API documentation complete and accurate
- [ ] No console errors in browser
- [ ] Lighthouse accessibility score maintained

---

## Task Breakdown

### Must-Have (MVP)
1. ✅ Database migration (add fields, backfill data)
2. ✅ CourseStepBookingService implementation
3. ✅ New controller endpoints
4. ✅ Shared types in `@thrive/shared`
5. ✅ ThriveClient methods
6. ✅ Update CourseStepBookingModal
7. ✅ Add auto-refresh listener
8. ✅ Basic testing
9. ✅ Update API docs

### Should-Have (Recommended)
10. ✅ Refactor SessionSelectionWizard
11. ✅ Change session endpoint
12. ✅ Cancel booking endpoint
13. ✅ Confirmation emails
14. ✅ Comprehensive test suite
15. ✅ Migration guide

### Nice-to-Have (Future)
16. ⏸ Waitlist support for full sessions
17. ⏸ Calendar integration
18. ⏸ Booking reminders (24h before session)
19. ⏸ Admin view of course bookings
20. ⏸ Booking analytics dashboard

---

## Risk Assessment

### High Risk Items
1. **Data Migration** - Existing bookings must be correctly backfilled
   - *Mitigation:* Dry-run migration on staging DB first
   - *Mitigation:* Create backup before migration
   - *Mitigation:* Verify counts match before/after

2. **Session ID Logic** - Must correctly map GroupClass → Session
   - *Mitigation:* Extensive testing of session selection logic
   - *Mitigation:* Add database constraints to prevent invalid references

3. **Transaction Failures** - Partial booking creation could corrupt data
   - *Mitigation:* Use proper transaction boundaries
   - *Mitigation:* Add rollback handlers
   - *Mitigation:* Add idempotency checks

### Medium Risk Items
4. **Breaking Changes** - Frontend/backend version mismatch during deployment
   - *Mitigation:* Deploy backend first, then frontend
   - *Mitigation:* Keep old endpoints working temporarily

5. **Capacity Calculation** - May double-count bookings if logic is wrong
   - *Mitigation:* Unit test capacity calculation
   - *Mitigation:* Manual verification on staging

### Low Risk Items
6. **Type Mismatches** - Shared types out of sync with API
   - *Mitigation:* TypeScript will catch at compile time
   - *Mitigation:* Use type generation tools (future)

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database & Entity Layer | 1 day | None |
| Phase 2: Backend Service Layer | 1.5 days | Phase 1 |
| Phase 3: Shared Types | 0.5 days | Phase 1 |
| Phase 4: ThriveClient Integration | 0.5 days | Phase 3 |
| Phase 5: Frontend Refactor | 1 day | Phase 4 |
| Phase 6: Testing & Validation | 0.5 days | Phases 2, 5 |
| Phase 7: Documentation & Cleanup | 0.5 days | All phases |

**Total Estimated Duration:** 5-6 days (1 sprint)

**Buffer for Issues:** +1-2 days

**Total with Buffer:** 6-8 days

---

## Implementation Notes

### Order of Implementation
1. **Backend First:** Ensure API works before updating frontend
2. **Incremental Testing:** Test each phase independently
3. **Backward Compatibility:** Keep old code paths working until verified
4. **Gradual Rollout:** Consider feature flag for new booking flow

### Code Review Checklist
- [ ] All database changes have migrations
- [ ] All new endpoints have authorization guards
- [ ] All transactions have proper error handling
- [ ] All types are in `@thrive/shared` (no inline types)
- [ ] All API calls use ThriveClient
- [ ] All user-facing errors are friendly
- [ ] All new code has tests
- [ ] All documentation is updated

### Deployment Checklist
- [ ] Staging environment tested
- [ ] Database backup created
- [ ] Migration dry-run completed
- [ ] Rollback plan reviewed
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment
- [ ] Backend deployed and verified
- [ ] Frontend deployed and verified
- [ ] Smoke tests pass in production
- [ ] Error logs monitored for 24h

---

## Questions to Resolve

1. **Email Templates:** Do we have email templates for course step booking confirmations?
   - *Action:* Check EmailService implementation
   - *Fallback:* Create generic booking confirmation template

2. **Cancellation Policy:** What are the cancellation windows for course step sessions?
   - *Action:* Confirm with business stakeholders
   - *Default:* 24 hours (same as regular bookings)

3. **Capacity Handling:** Should full sessions show waitlist option or just disable booking?
   - *Action:* Decide based on UX requirements
   - *Default:* Disable booking, show "Full" status

4. **Session Instance Selection:** How to select which specific session instance when multiple future sessions exist?
   - *Action:* Review CourseCohortSession and GroupClass relationships
   - *Current:* Select next available session for the group class

5. **Payment Status:** Course bookings are prepaid - how should this affect regular booking flows?
   - *Action:* Ensure BookingService handles `paymentStatus='PAID'` correctly
   - *Test:* Verify no payment prompts appear for course bookings

---

## Related Documentation

- [Course Student View API](./02-api-endpoints.md) - Current API specification
- [Student Enrollment Flow](./01-student-enrollment-flow.md) - Overall enrollment process
- [Booking System Architecture](../booking-system.md) - Regular booking patterns
- [Email Templates](../email-templates.md) - Notification templates
- [NestJS Patterns](.github/instructions/nestjs.instructions.md) - Service patterns

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-09 | System | Initial consolidation plan created |

---

## Approvals

- [ ] Technical Lead Review
- [ ] Product Owner Sign-off
- [ ] QA Team Review
- [ ] Security Review (if needed)
