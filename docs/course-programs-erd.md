# Course Programs Database ERD (Simplified Architecture)

## Overview
This ERD defines the simplified database schema for the course programs feature, which leverages the existing package-allowance system instead of creating parallel infrastructure.

**Key Design Decision**: Courses are treated as a special type of `PackageAllowance` within the existing package system, with lightweight progress tracking for individual steps.

---

## Entity Changes Summary

### Reuse Existing Tables
- ✅ `stripe_product_map` - Represents Stripe products (including courses)
- ✅ `package_allowance` - Grants access to services (PRIVATE, GROUP, or COURSE)
- ✅ `student_package` - Student purchase records (works for all package types)
- ✅ `package_use` - Credit consumption tracking (PRIVATE/GROUP only)

### New Tables
- ✅ `course_program` - Course metadata (code, title, description)
- ✅ `course_step` - Sequential steps within a course
- ✅ `course_step_option` - Links steps to group_class options
- ✅ `student_course_step_progress` - Tracks which steps student has booked/completed

### Deleted Tables (from original plan)
- ❌ `course_bundle_component` - Replaced by PackageAllowance
- ❌ `student_course_enrollment` - Replaced by StudentPackage
- ❌ `student_course_progress` - Replaced by StudentCourseStepProgress

---

## Modified Entity: package_allowance

**New column**:
```sql
course_program_id INT NULL  -- FK to course_program.id (only for COURSE service type)
```

**Purpose**: When `serviceType = 'COURSE'`, this links the allowance to the course program it grants access to.

**Schema**:
```sql
CREATE TABLE package_allowance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stripe_product_map_id INT NOT NULL,
  service_type ENUM('PRIVATE','GROUP','COURSE') NOT NULL,
  teacher_tier SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  credits SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  credit_unit_minutes TINYINT UNSIGNED NULL,  -- 15, 30, 45, 60 (NULL for COURSE)
  course_program_id INT NULL,                 -- ✅ NEW: Only set for COURSE allowances
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,

  FOREIGN KEY (stripe_product_map_id) REFERENCES stripe_product_map(id),
  FOREIGN KEY (course_program_id) REFERENCES course_program(id),

  KEY IDX_package_allowance_product (stripe_product_map_id),
  KEY IDX_package_allowance_course (course_program_id)
);
```

---

## New Entity: course_program

**Purpose**: High-level course definition with marketing metadata.

**Schema**:
```sql
CREATE TABLE course_program (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,

  UNIQUE KEY IDX_course_program_code (code),
  KEY IDX_course_program_active (is_active)
);
```

**Note**: Unlike the original plan, `stripe_product_id` and `stripe_price_id` are NOT stored here. They live in `stripe_product_map` where all Stripe mappings belong.

---

## New Entity: course_step

**Purpose**: Ordered steps within a course program.

**Schema**:
```sql
CREATE TABLE course_step (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_program_id INT NOT NULL,
  step_order SMALLINT UNSIGNED NOT NULL,
  label VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,

  FOREIGN KEY (course_program_id) REFERENCES course_program(id),

  UNIQUE KEY IDX_course_step_program_label (course_program_id, label),
  KEY IDX_course_step_program_order (course_program_id, step_order)
);
```

---

## New Entity: course_step_option

**Purpose**: Links course steps to available group class options (many-to-many).

**Schema**:
```sql
CREATE TABLE course_step_option (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_step_id INT NOT NULL,
  group_class_id INT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,

  FOREIGN KEY (course_step_id) REFERENCES course_step(id),
  FOREIGN KEY (group_class_id) REFERENCES group_class(id),

  UNIQUE KEY IDX_course_step_option_unique (course_step_id, group_class_id),
  KEY IDX_course_step_option_step (course_step_id),
  KEY IDX_course_step_option_class (group_class_id)
);
```

---

## New Entity: student_course_step_progress

**Purpose**: Tracks student progress through course steps (enrollment-based, not credit-based).

**Schema**:
```sql
CREATE TABLE student_course_step_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_package_id INT NOT NULL,
  course_step_id INT NOT NULL,
  status ENUM('UNBOOKED','BOOKED','COMPLETED','MISSED','CANCELLED') NOT NULL DEFAULT 'UNBOOKED',
  session_id INT NULL,
  booked_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  FOREIGN KEY (student_package_id) REFERENCES student_package(id),
  FOREIGN KEY (course_step_id) REFERENCES course_step(id),
  FOREIGN KEY (session_id) REFERENCES session(id),

  UNIQUE KEY IDX_student_course_step_progress_unique (student_package_id, course_step_id),
  KEY IDX_student_course_step_progress_package (student_package_id),
  KEY IDX_student_course_step_progress_step (course_step_id),
  KEY IDX_student_course_step_progress_session (session_id)
);
```

**Key Difference from PackageUse**:
- `PackageUse` tracks credit **consumption** (PRIVATE/GROUP allowances)
- `StudentCourseStepProgress` tracks enrollment **progress** (COURSE allowances)
- No `deletedAt` column - progress records are never soft-deleted

---

## Entity Relationship Diagram

```
stripe_product_map (1) ──── (N) package_allowance
                                  │
                                  │ if serviceType = COURSE
                                  ▼
                             course_program (1) ──── (N) course_step
                                                          │
                                                          │
                                                          └─ (N) course_step_option (N) ─── group_class

student (1) ─── (N) student_package ────┬──── (N) package_use (for PRIVATE/GROUP)
                                         │
                                         └──── (N) student_course_step_progress (for COURSE)
```

**Data Flow**:
1. Admin creates `CourseProgram` with `CourseStep` entities
2. Admin creates Stripe product → `StripeProductMap` with `PackageAllowances`:
   - 1x COURSE allowance (links to CourseProgram)
   - Optional PRIVATE/GROUP allowances (bonus credits)
3. Student purchases → `StudentPackage` created
4. Webhook seeds `StudentCourseStepProgress` rows (one per step)
5. Student books step → Update progress.status (NOT PackageUse)
6. Student uses bonus credit → Create `PackageUse` record

---

## Migration Strategy

### Step 1: Add course_program_id to package_allowance
```sql
ALTER TABLE package_allowance
  ADD COLUMN course_program_id INT NULL AFTER credit_unit_minutes,
  ADD CONSTRAINT FK_package_allowance_course_program
    FOREIGN KEY (course_program_id) REFERENCES course_program(id);
```

### Step 2: Create new course tables
```sql
CREATE TABLE course_program (...);
CREATE TABLE course_step (...);
CREATE TABLE course_step_option (...);
CREATE TABLE student_course_step_progress (...);
```

### Step 3: Drop old course tables (if they exist)
```sql
DROP TABLE IF EXISTS course_bundle_component;
DROP TABLE IF EXISTS student_course_progress;
DROP TABLE IF EXISTS student_course_enrollment;
```

### Step 4: Remove Stripe IDs from course_program (if they exist)
```sql
ALTER TABLE course_program
  DROP COLUMN IF EXISTS stripe_product_id,
  DROP COLUMN IF EXISTS stripe_price_id;
```

---

## Data Integrity Rules

1. **One COURSE allowance per StripeProductMap**: A package can only grant access to one course program
2. **courseProgramId validation**: If `serviceType = 'COURSE'`, `courseProgramId` must be set; otherwise NULL
3. **Step ordering**: `course_step.step_order` must be unique within each course_program
4. **Step labels**: `course_step.label` must be unique within each course_program
5. **Single progress per step**: Student can only have one progress record per (package, step) combination
6. **No PackageUse for courses**: Course bookings update `StudentCourseStepProgress`, not `PackageUse`

---

## Example Data

### Course Bundle Package

**StripeProductMap**:
```
{
  id: 123,
  serviceKey: "course_sfz_foundation",
  stripeProductId: "prod_SFZ",
  scopeType: "COURSE",
  scopeId: 42
}
```

**PackageAllowances** (linked to above):
```
[
  { id: 1, serviceType: 'COURSE', courseProgramId: 42, credits: 1 },
  { id: 2, serviceType: 'PRIVATE', credits: 2, creditUnitMinutes: 30, teacherTier: 0 },
  { id: 3, serviceType: 'GROUP', credits: 3, creditUnitMinutes: 60, teacherTier: 0 }
]
```

**CourseProgram**:
```
{
  id: 42,
  code: "SFZ",
  title: "SFZ Foundation Course",
  steps: [
    { id: 101, stepOrder: 1, label: "SFZ-1" },
    { id: 102, stepOrder: 2, label: "SFZ-2" },
    { id: 103, stepOrder: 3, label: "SFZ-3" },
    { id: 104, stepOrder: 4, label: "SFZ-4" }
  ]
}
```

**After student purchases**:
```sql
-- StudentPackage created
INSERT INTO student_package (student_id, stripe_product_map_id, package_name, total_sessions)
VALUES (789, 123, 'SFZ Foundation Course', 6);  -- 1 course + 2 private + 3 group

-- Progress rows seeded (one per step)
INSERT INTO student_course_step_progress (student_package_id, course_step_id, status)
VALUES
  (456, 101, 'UNBOOKED'),
  (456, 102, 'UNBOOKED'),
  (456, 103, 'UNBOOKED'),
  (456, 104, 'UNBOOKED');
```

**When student books step 1**:
```sql
-- Update progress (NO PackageUse created)
UPDATE student_course_step_progress
SET status = 'BOOKED', session_id = 5555, booked_at = NOW()
WHERE student_package_id = 456 AND course_step_id = 101;
```

**When student uses bonus private credit**:
```sql
-- Create PackageUse (standard credit consumption)
INSERT INTO package_use (student_package_id, allowance_id, session_id, credits_used)
VALUES (456, 2, 6666, 1);  -- allowanceId = 2 (PRIVATE allowance)
```

---

## Comparison: Old vs New Architecture

### Old (Original Plan)
```
student_course_enrollment (stores stripe IDs, status)
  ├─ student_course_progress (tracks step booking)
  └─ course_bundle_component (defines bundled extras)
```

**Problems**:
- Duplicate purchase tracking (StudentCourseEnrollment vs StudentPackage)
- Duplicate credit tracking (CourseBundleComponent vs PackageAllowance)
- Duplicate progress tracking (StudentCourseProgress vs PackageUse)
- Can't easily bundle courses with other service types
- Different Stripe webhook handlers for courses vs packages

### New (Simplified)
```
student_package (works for all purchases)
  ├─ package_allowance.courseProgramId (grants course access)
  └─ student_course_step_progress (lightweight step tracking)
```

**Benefits**:
- Single purchase system (StudentPackage)
- Single allowance system (PackageAllowance)
- Unified Stripe webhook (all purchases)
- Can easily bundle courses with private/group credits
- Reuses existing balance computation logic

---

## Future Enhancements

These can be added without schema changes:

1. **Course expiration**: Use `student_package.expiresAt` (already exists)
2. **Multi-seat gifting**: Create multiple StudentPackages from one Stripe purchase
3. **Course materials**: Add `course_step.materialUrl` or JSON metadata field
4. **Prerequisites**: Add `course_step.prerequisiteStepId` self-referencing FK
5. **Certificates**: Track completion in `student_course_step_progress.completedAt`

---

## Validation Checklist

Before considering migration complete:

- [ ] `package_allowance.course_program_id` column added with FK
- [ ] All 4 new course tables created with correct constraints
- [ ] Old course tables dropped (if they existed)
- [ ] Existing StudentPackage webhook works for COURSE allowances
- [ ] Course step progress seeded on purchase
- [ ] Course booking updates StudentCourseStepProgress (not PackageUse)
- [ ] Bundle packages can mix COURSE + PRIVATE + GROUP allowances
- [ ] Admin UI creates courses as StripeProductMap with COURSE allowance

---

## Summary

This simplified architecture treats courses as **first-class citizens in the package system** rather than special snowflakes requiring parallel infrastructure. The only new complexity is `StudentCourseStepProgress`, which is necessary because courses use enrollment-based access (not credit consumption).

**Core principle**: Courses are just another type of allowance that happens to unlock access to a structured curriculum rather than consuming credits.
