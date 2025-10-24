# Course Programs: Simplified Architecture Using Package-Allowance Pattern

## Executive Summary

The original course implementation is **overly complex** and duplicates existing package/allowance infrastructure. This document proposes a simplified architecture that treats courses as a special type of allowance within the existing package system.

**Key Insight**: A course is fundamentally a **bundle of allowances** - it grants access to specific course steps AND can include bonus private/group credits. The existing `StripeProductMap → PackageAllowance → StudentPackage → PackageUse` pattern already handles this perfectly.

---

## Problems with Current Implementation

### 1. Duplicate Credit Tracking

**Current**: Two parallel systems for tracking credits
- `PackageAllowance` + `PackageUse` for private/group credits
- `CourseBundleComponent` + `StudentCourseProgress` for course credits

**Issue**: Same problem solved twice with different schemas, causing:
- Code duplication
- Maintenance burden
- Confusion about source of truth
- Different balance computation patterns

### 2. Separate Enrollment System

**Current**: `StudentCourseEnrollment` entity separate from `StudentPackage`

**Issue**:
- Courses are purchases just like packages
- Both come from Stripe products
- Both grant entitlements
- Both need balance tracking
- Why maintain two systems?

### 3. Complex Bundle Logic

**Current**: `CourseBundleComponent` with `componentType` enum and metadata

**Issue**:
- Reimplements what `PackageAllowance` already does
- Can't leverage existing tier system
- Can't reuse balance computation utilities
- Can't bundle courses with other service types in UI

### 4. ServiceType Already Exists

**Observation**: `ServiceType.COURSE` is **already defined** and **already handled** in credit-tiers.ts:
```typescript
export const SERVICE_TYPE_BASE_TIERS = {
  [ServiceType.PRIVATE]: 100,
  [ServiceType.GROUP]: 50,
  [ServiceType.COURSE]: 0, // Course sessions use enrollment, not credits
} as const;
```

The tier system already knows courses don't consume package credits!

---

## Proposed Simplified Architecture

### Core Principle

**A course is a Stripe product with multiple PackageAllowances:**
1. One `COURSE` allowance per course step (grants access to that step)
2. Zero or more `PRIVATE`/`GROUP` allowances (bonus credits bundled with purchase)

### Schema Changes

#### Keep (Minimal Course Structure)
```
✅ course_program               - Course metadata (title, description)
✅ course_step                  - Sequential steps within a course
✅ course_step_option           - Links steps to group_class options
✅ student_course_step_progress - NEW: Lightweight step progress tracking
```

#### Remove (Use Existing Package System)
```
❌ course_bundle_component   - Replace with PackageAllowance
❌ student_course_enrollment - Replace with StudentPackage
```

**Key Design Decision**: We need `student_course_step_progress` because courses are enrollment-based (not credit-based). Course bookings don't consume PackageUse credits - they verify enrollment via the StudentPackage → PackageAllowance → CourseProgram chain.

### Example: "SFZ Foundation Course" Bundle

**CourseProgram** (course structure):
```typescript
CourseProgram {
  id: 42,
  code: "SFZ",
  title: "SFZ Foundation Course",
  steps: [
    { id: 101, stepOrder: 1, label: "SFZ-1", title: "Introduction" },
    { id: 102, stepOrder: 2, label: "SFZ-2", title: "Fundamentals" },
    { id: 103, stepOrder: 3, label: "SFZ-3", title: "Advanced Techniques" },
    { id: 104, stepOrder: 4, label: "SFZ-4", title: "Master Class" }
  ]
}
```

**Stripe Product**: `prod_SFZ_FOUNDATION`

**StripeProductMap**:
```typescript
{
  id: 123,
  serviceKey: "course_sfz_foundation",
  stripeProductId: "prod_SFZ_FOUNDATION",
  scopeType: ScopeType.COURSE,
  scopeId: 42,  // course_program.id
  allowances: [
    // Single course allowance (grants access to entire course)
    { id: 1, serviceType: COURSE, courseProgramId: 42, credits: 1 },
    // Bonus credits bundled with course
    { id: 2, serviceType: PRIVATE, credits: 2, creditUnitMinutes: 30, teacherTier: 0 },
    { id: 3, serviceType: GROUP, credits: 3, creditUnitMinutes: 60, teacherTier: 0 }
  ]
}
```

**StudentPackage** (created on purchase via Stripe webhook):
```typescript
{
  id: 456,
  studentId: 789,
  stripeProductMapId: 123,
  packageName: "SFZ Foundation Course",
  totalSessions: 6,  // 1 course enrollment + 2 private + 3 group
  purchasedAt: "2025-01-15T10:00:00Z",
  expiresAt: null
}
```

**StudentCourseStepProgress** (seeded on purchase):
```typescript
[
  { id: 1, studentPackageId: 456, courseStepId: 101, status: 'UNBOOKED' },
  { id: 2, studentPackageId: 456, courseStepId: 102, status: 'UNBOOKED' },
  { id: 3, studentPackageId: 456, courseStepId: 103, status: 'UNBOOKED' },
  { id: 4, studentPackageId: 456, courseStepId: 104, status: 'UNBOOKED' }
]
```

**When student books step 1**:
```typescript
// Update progress (NOT PackageUse - courses don't consume credits)
UPDATE student_course_step_progress
SET status = 'BOOKED', sessionId = 5555, bookedAt = NOW()
WHERE studentPackageId = 456 AND courseStepId = 101;
```

**Note**: Course bookings do NOT create PackageUse records because courses use enrollment-based access (tier = 0), not credit consumption.

---

## Updated Entity Schemas

### 1. PackageAllowance (EXTEND)

**Add column**:
```typescript
@Column({ nullable: true })
courseProgramId?: number;

@ManyToOne(() => CourseProgram)
courseProgram?: CourseProgram;
```

**Validation**:
- If `serviceType === COURSE`, `courseProgramId` must be set
- If `serviceType !== COURSE`, `courseProgramId` must be null
- One PackageAllowance grants access to the **entire course**, not individual steps

### 2. CourseProgram (SIMPLIFY)

**Remove columns**:
```diff
- stripe_product_id    ❌ Stored in StripeProductMap
- stripe_price_id      ❌ Stored in StripeProductMap
- priceInCents         ❌ Stored in Stripe
```

**Keep columns**:
```typescript
✅ id, code, title, description, timezone, is_active
✅ created_at, updated_at, deleted_at
```

### 3. CourseStep (KEEP AS-IS)

No changes needed:
```typescript
✅ id, course_program_id, step_order, label, title, description, is_required
```

### 4. CourseStepOption (KEEP AS-IS)

No changes needed:
```typescript
✅ id, course_step_id, group_class_id, is_active
```

### 5. StudentCourseStepProgress (NEW - LIGHTWEIGHT)

**Add table** for tracking step-by-step progress:
```typescript
@Entity('student_course_step_progress')
export class StudentCourseStepProgress extends BaseEntity {
  @Column()
  studentPackageId: number;

  @Column()
  courseStepId: number;

  @Column({ type: 'enum', enum: ['UNBOOKED', 'BOOKED', 'COMPLETED', 'MISSED', 'CANCELLED'] })
  status: string;

  @Column({ nullable: true })
  sessionId?: number;

  @Column({ type: 'datetime', nullable: true })
  bookedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => StudentPackage)
  studentPackage: StudentPackage;

  @ManyToOne(() => CourseStep)
  courseStep: CourseStep;

  @ManyToOne(() => Session)
  session?: Session;
}
```

**Purpose**:
- Links StudentPackage (purchase) to CourseStep (curriculum)
- Tracks booking status per step without consuming PackageUse credits
- Seeded on purchase with all steps in UNBOOKED status
- Updated when student books/completes steps

**Key Difference from PackageUse**:
- PackageUse = credit consumption (private/group classes)
- StudentCourseStepProgress = enrollment-based access (courses)

---

## Data Flow Comparison

### Old Flow (Complex)
```
Admin creates course
  → CourseProgram created
  → CourseBundleComponent created (for private/group credits)
  → Publish to Stripe → stripeProductId stored on CourseProgram

Student purchases
  → Stripe webhook fires
  → StudentCourseEnrollment created
  → StudentCourseProgress rows seeded (one per step)
  → Separate logic to issue bundled credits via StudentPackage

Student books step
  → Custom validation: Check StudentCourseProgress
  → Update progress.status = 'BOOKED'
  → Set progress.creditConsumed = true
  → NO interaction with PackageUse
```

### New Flow (Simplified)
```
Admin creates course
  → CourseProgram created
  → CourseStep entities created
  → Admin creates Stripe product via packages.service.ts with allowances:
     - One COURSE allowance per step
     - Optional PRIVATE/GROUP allowances for bonus credits
  → StripeProductMap created with scopeType=COURSE, scopeId=courseProgramId

Student purchases
  → Stripe webhook fires (existing payments webhook)
  → StudentPackage created (standard flow)
  → NO special course logic needed

Student books step
  → Existing booking validation: packages.service.findCompatiblePackagesForSession()
  → Filter to COURSE allowances matching courseStepId
  → Create PackageUse record (standard flow)
  → Balance computed via existing bundle-helpers.ts
```

**Result**: Course purchases use the EXACT same code path as package purchases.

---

## Implementation Changes Required

### Phase 1: Schema Migration

**File**: `apps/nestjs/src/migrations/1763000000000-SimplifyCourseProgramSchema.ts`

```typescript
// 1. Add course_program_id to package_allowance
await queryRunner.addColumn('package_allowance',
  new TableColumn({ name: 'course_program_id', type: 'int', isNullable: true })
);

// 2. Add FK
await queryRunner.createForeignKey('package_allowance', new TableForeignKey({
  columnNames: ['course_program_id'],
  referencedTableName: 'course_program',
  referencedColumnNames: ['id']
}));

// 3. Create new lightweight progress table
await queryRunner.createTable(new Table({
  name: 'student_course_step_progress',
  columns: [
    { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
    { name: 'student_package_id', type: 'int', isNullable: false },
    { name: 'course_step_id', type: 'int', isNullable: false },
    { name: 'status', type: 'enum', enum: ['UNBOOKED', 'BOOKED', 'COMPLETED', 'MISSED', 'CANCELLED'], default: "'UNBOOKED'" },
    { name: 'session_id', type: 'int', isNullable: true },
    { name: 'booked_at', type: 'datetime', precision: 3, isNullable: true },
    { name: 'completed_at', type: 'datetime', precision: 3, isNullable: true },
    { name: 'created_at', type: 'datetime', precision: 3, default: 'CURRENT_TIMESTAMP(3)' },
    { name: 'updated_at', type: 'datetime', precision: 3, default: 'CURRENT_TIMESTAMP(3)', onUpdate: 'CURRENT_TIMESTAMP(3)' }
  ]
}));

// 4. Add FKs for progress table
await queryRunner.createForeignKey('student_course_step_progress', new TableForeignKey({
  columnNames: ['student_package_id'],
  referencedTableName: 'student_package',
  referencedColumnNames: ['id']
}));
await queryRunner.createForeignKey('student_course_step_progress', new TableForeignKey({
  columnNames: ['course_step_id'],
  referencedTableName: 'course_step',
  referencedColumnNames: ['id']
}));
await queryRunner.createForeignKey('student_course_step_progress', new TableForeignKey({
  columnNames: ['session_id'],
  referencedTableName: 'session',
  referencedColumnNames: ['id']
}));

// 5. Add unique constraint
await queryRunner.createIndex('student_course_step_progress', new TableIndex({
  name: 'IDX_student_course_step_progress_unique',
  columnNames: ['student_package_id', 'course_step_id'],
  isUnique: true
}));

// 6. Drop redundant course columns
await queryRunner.dropColumn('course_program', 'stripe_product_id');
await queryRunner.dropColumn('course_program', 'stripe_price_id');

// 7. Drop redundant course tables
await queryRunner.dropTable('course_bundle_component');
await queryRunner.dropTable('student_course_progress');
await queryRunner.dropTable('student_course_enrollment');
```

### Phase 2: Entity Updates

**Files to Modify**:
- ✅ `packages/entities/package-allowance.entity.ts` - Add courseProgramId column
- ✅ `course-programs/entities/student-course-step-progress.entity.ts` - CREATE NEW
- ❌ `course-programs/entities/course-program.entity.ts` - Remove stripe fields
- ❌ `course-programs/entities/course-bundle-component.entity.ts` - DELETE
- ❌ `course-programs/entities/student-course-enrollment.entity.ts` - DELETE
- ❌ `course-programs/entities/student-course-progress.entity.ts` - DELETE

### Phase 3: Service Refactoring

**Delete Services**:
```
❌ course-programs/services/course-enrollments.service.ts
```

**Create New Service**:
```
✅ course-programs/services/course-step-progress.service.ts
   - Manage StudentCourseStepProgress lifecycle
   - Seed progress rows on package purchase
   - Update status on booking/completion
   - Query progress for student dashboard
```

**Extend Existing Services**:
```
✅ packages/packages.service.ts
   - findCompatiblePackagesForSession() to check COURSE allowances
   - Filter by courseProgramId when booking course sessions
   - Seed progress rows in webhook handler after StudentPackage created

✅ packages/utils/bundle-helpers.ts
   - No changes needed (COURSE allowances don't use credit consumption)
```

**Simplify Course Services**:
```
✅ course-programs/services/course-programs.service.ts
   - Remove publishToStripe() (use packages.service.ts instead)
   - Keep CRUD for CourseProgram entity only

✅ course-programs/services/course-steps.service.ts
   - Keep CRUD for CourseStep entity only
```

### Phase 4: Controller Updates

**Admin Controller**: `course-programs/controllers/admin-course-programs.controller.ts`

**Remove endpoints**:
```
❌ POST /:id/publish          - Use packages admin instead
❌ POST /:id/bundle-component  - Use packages admin instead
```

**Keep endpoints**:
```
✅ CRUD for course programs (metadata only)
✅ CRUD for course steps
✅ Attach/detach group classes to steps
```

**Public Controller**: `course-programs/controllers/course-programs.controller.ts`

**Remove endpoints**:
```
❌ GET /:id/enrollment-status  - Use /packages/my-credits instead
❌ GET /me/enrollments         - Use /packages/my-credits instead
```

**Keep endpoints**:
```
✅ GET /            - List active courses
✅ GET /:id         - Course detail with steps/options
```

### Phase 5: Shared Types

**File**: `packages/shared/src/types/course-programs.ts`

**Remove DTOs**:
```
❌ CreateBundleComponentSchema
❌ BundleComponentDetailSchema
❌ EnrollmentStatusSchema
❌ StepProgressSchema
❌ PublishCourseSchema
```

**Keep DTOs**:
```
✅ CreateCourseProgramSchema (metadata only)
✅ CreateCourseStepSchema
✅ AttachStepOptionSchema
✅ Course list/detail schemas (read-only views)
```

### Phase 6: Booking Integration

**File**: `bookings/bookings.service.ts`

**New approach**:
```typescript
async createBooking(studentId: number, sessionId: number, courseStepId?: number) {
  const session = await this.sessionsRepo.findOne(sessionId, { relations: ['groupClass'] });

  if (session.type === ServiceType.COURSE && courseStepId) {
    // Course booking - validate enrollment
    const step = await this.courseStepsRepo.findOne(courseStepId, {
      relations: ['courseProgram']
    });

    // Find student's package that grants access to this course
    const coursePackage = await this.studentPackageRepo.findOne({
      where: {
        studentId,
        stripeProductMap: {
          allowances: {
            serviceType: ServiceType.COURSE,
            courseProgramId: step.courseProgram.id
          }
        }
      },
      relations: ['stripeProductMap', 'stripeProductMap.allowances']
    });

    if (!coursePackage) {
      throw new ForbiddenException('You must be enrolled in this course to book this session');
    }

    // Check step progress
    const progress = await this.stepProgressRepo.findOne({
      where: { studentPackageId: coursePackage.id, courseStepId }
    });

    if (progress.status === 'COMPLETED' || progress.status === 'BOOKED') {
      throw new BadRequestException('Step already booked or completed');
    }

    // Create booking (no PackageUse - courses don't consume credits)
    const booking = await this.createBookingRecord(studentId, sessionId);

    // Update progress
    await this.stepProgressRepo.update(progress.id, {
      status: 'BOOKED',
      sessionId: booking.id,
      bookedAt: new Date()
    });

    return booking;
  }

  // Regular private/group booking - use existing package credit logic
  return this.createRegularBooking(studentId, sessionId);
}
```

**Key Points**:
- Course bookings validate enrollment via StudentPackage → PackageAllowance → CourseProgram
- Update StudentCourseStepProgress (not PackageUse)
- No credit consumption for course sessions
- Regular bookings use existing package credit logic unchanged

---

## Benefits of Simplified Approach

### 1. Code Reuse
- ✅ Single credit tracking system (`PackageUse`)
- ✅ Single balance computation (`bundle-helpers.ts`)
- ✅ Single purchase flow (Stripe webhook → `StudentPackage`)
- ✅ Single booking validation (`findCompatiblePackagesForSession`)

### 2. UI Consistency
- ✅ Courses appear in "My Credits" alongside other packages
- ✅ Bundle packages can mix COURSE + PRIVATE + GROUP allowances
- ✅ Same credit selection UI for all service types
- ✅ Unified purchase history

### 3. Maintainability
- ✅ ~1000 fewer lines of code
- ✅ Remove 3 entities, 2 services, 1 guard
- ✅ Remove ~15 DTOs
- ✅ Single migration to maintain

### 4. Feature Parity
- ✅ Students still purchase courses via Stripe
- ✅ Students still book one option per step
- ✅ Progress still tracked (via `PackageUse`)
- ✅ Bonus credits still bundled
- ✅ Refunds still work (delete `StudentPackage`)

### 5. Future Flexibility
- ✅ Can easily add COURSE allowances to existing bundle packages
- ✅ Can implement "course subscription" (recurring COURSE allowances)
- ✅ Can apply teacher tier restrictions to courses
- ✅ Can use existing package expiration logic

---

## Migration Path for Existing Data

### If Already Implemented

**Files to Remove**:
```bash
rm apps/nestjs/src/course-programs/entities/course-bundle-component.entity.ts
rm apps/nestjs/src/course-programs/entities/student-course-enrollment.entity.ts
rm apps/nestjs/src/course-programs/entities/student-course-progress.entity.ts
rm apps/nestjs/src/course-programs/services/course-enrollments.service.ts
rm apps/nestjs/src/course-programs/services/course-progress.service.ts
rm apps/nestjs/src/course-programs/guards/course-enrollment.guard.ts
```

**Controllers to Simplify**:
- Remove enrollment/progress endpoints from `course-programs.controller.ts`
- Remove publish/bundle endpoints from `admin-course-programs.controller.ts`

**Services to Simplify**:
- Remove `publishToStripe()` from `course-programs.service.ts`
- Move step CRUD to standalone service or keep minimal

**Types to Remove**:
- Remove 5+ DTOs from `packages/shared/src/types/course-programs.ts`

### Migration SQL

```sql
-- If any test data exists in old tables
SELECT * FROM student_course_enrollment;  -- Should be empty
SELECT * FROM student_course_progress;    -- Should be empty
SELECT * FROM course_bundle_component;    -- Should be empty

-- Safe to drop if empty
DROP TABLE student_course_progress;
DROP TABLE student_course_enrollment;
DROP TABLE course_bundle_component;

-- Add new column to package_allowance (only courseProgramId needed!)
ALTER TABLE package_allowance
  ADD COLUMN course_program_id INT NULL;

-- Add FK
ALTER TABLE package_allowance
  ADD CONSTRAINT FK_package_allowance_course_program
    FOREIGN KEY (course_program_id) REFERENCES course_program(id);

-- Create new lightweight progress table
CREATE TABLE student_course_step_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_package_id INT NOT NULL,
  course_step_id INT NOT NULL,
  status ENUM('UNBOOKED', 'BOOKED', 'COMPLETED', 'MISSED', 'CANCELLED') NOT NULL DEFAULT 'UNBOOKED',
  session_id INT NULL,
  booked_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY IDX_student_course_step_progress_unique (student_package_id, course_step_id),
  KEY IDX_student_course_step_progress_package (student_package_id),
  KEY IDX_student_course_step_progress_step (course_step_id),

  CONSTRAINT FK_student_course_step_progress_package
    FOREIGN KEY (student_package_id) REFERENCES student_package(id),
  CONSTRAINT FK_student_course_step_progress_step
    FOREIGN KEY (course_step_id) REFERENCES course_step(id),
  CONSTRAINT FK_student_course_step_progress_session
    FOREIGN KEY (session_id) REFERENCES session(id)
);

-- Remove redundant columns
ALTER TABLE course_program
  DROP COLUMN stripe_product_id,
  DROP COLUMN stripe_price_id;
```

---

## Updated Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                   STRIPE PRODUCT                          │
│              (Course SFZ Foundation Bundle)               │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│                 StripeProductMap                          │
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
   │ Allowance│   │Allowance│    │Allowance│    │Allowance│
   │         │    │  #1     │    │  #2     │    │   #3    │
   │Points to:│   │ 30 min  │    │ 30 min  │    │ 60 min  │
   │CourseID │    └─────────┘    └─────────┘    └─────────┘
   │   42    │
   └────┬────┘
        │
        │ References
        ▼
   ┌─────────────────┐
   │  CourseProgram  │
   │    (id: 42)     │
   │  ┌──────────┐   │
   │  │ Step 1   │   │
   │  │ Step 2   │   │
   │  │ Step 3   │   │
   │  │ Step 4   │   │
   │  └──────────┘   │
   └─────────────────┘

                    STUDENT PURCHASES
                           ↓
        ┌──────────────────────────────────────┐
        │        StudentPackage                 │
        │  (Links Student + StripeProductMap)  │
        │                                       │
        │  studentId: 789                       │
        │  stripeProductMapId: 123              │
        └──────────────┬───────────────────────┘
                       │
                       │ Grants access to ALL allowances
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────────┐    ┌──────────────────────┐
│ StudentCourseStep    │    │    PackageUse        │
│     Progress         │    │  (When PRIVATE or    │
│ (For COURSE          │    │   GROUP allowance    │
│  allowances)         │    │   is consumed)       │
│                      │    │                      │
│ Step 1: BOOKED       │    │ Used allowance #1    │
│ Step 2: UNBOOKED     │    │ Used allowance #3    │
│ Step 3: UNBOOKED     │    │ ...                  │
│ Step 4: UNBOOKED     │    └──────────────────────┘
└──────────────────────┘
```

**Data Flow**:

1. **Purchase**: `Student` → `StudentPackage` (links to `StripeProductMap`)
2. **StripeProductMap** has multiple `PackageAllowances`:
   - 1x COURSE allowance (points to CourseProgram)
   - 2x PRIVATE allowances (bonus credits)
   - 1x GROUP allowance (bonus credits)
3. **On purchase webhook**:
   - Create `StudentPackage`
   - Seed `StudentCourseStepProgress` rows (one per step in the course)
4. **When student books**:
   - **Course step**: Update `StudentCourseStepProgress.status = 'BOOKED'` (NO PackageUse)
   - **Private/Group class**: Create `PackageUse` record (standard credit consumption)

**Key Principles**:
- ✅ `StudentPackage` is the hub connecting student to ALL allowances
- ✅ COURSE allowances don't create PackageUse (enrollment-based)
- ✅ PRIVATE/GROUP allowances DO create PackageUse (credit-based)
- ✅ One StudentPackage can have both COURSE and PRIVATE/GROUP allowances
- ✅ Progress tracking is separate for courses (StudentCourseStepProgress) vs credits (PackageUse)

---

## Next Steps

1. ✅ Review this document with team
2. ⏳ Get approval for simplified approach
3. ⏳ Create migration to drop old tables and extend PackageAllowance
4. ⏳ Delete redundant services/controllers/DTOs
5. ⏳ Extend packages.service.ts to handle COURSE service type filtering
6. ⏳ Update booking flow to use findCompatiblePackagesForSession
7. ⏳ Update admin UI to create courses as special bundle packages
8. ⏳ Update docs to reflect new architecture
9. ⏳ Write tests for course booking via package system

---

## Conclusion

The original course implementation treats courses as a special snowflake requiring parallel infrastructure. The simplified approach recognizes that **courses are just structured bundles of allowances** and leverages the robust package system already in place.

**Impact**:
- **-2 entities** (course_bundle_component, student_course_enrollment)
- **-1 service** (course-enrollments.service)
- **-1 guard** (course-enrollment.guard)
- **-10+ DTOs** (enrollment, bundle component schemas)
- **-800+ lines of code**
- **+1 column** (package_allowance.course_program_id)
- **+1 lightweight table** (student_course_step_progress for step-by-step tracking)

**Result**: Simpler, more maintainable, more consistent with existing patterns. Course purchases use the same Stripe webhook → StudentPackage flow as regular packages.
