# Course Programs Database ERD

## Overview
This ERD defines the database schema for the course programs feature, which allows selling structured multi-step courses as Stripe products. The schema extends the existing platform while maintaining compatibility.

## Key Entities & Relationships

### 1. course_program
High-level course program definition with marketing metadata and Stripe product linkage.

**Columns:**
- `id` int PK AUTO_INCREMENT
- `code` varchar(50) NOT NULL UNIQUE - Human-readable code (e.g., "SFZ", "ADV-TECH")
- `title` varchar(255) NOT NULL - Course title
- `description` text NULL - Marketing description
- `timezone` varchar(64) DEFAULT 'America/New_York' - Default timezone for scheduling
- `is_active` tinyint(1) NOT NULL DEFAULT 1 - Whether course is available for purchase
- `stripe_product_id` varchar(255) NULL - Stripe product ID
- `stripe_price_id` varchar(255) NULL - Stripe price ID
- `created_at`, `updated_at`, `deleted_at` (from BaseEntity)

**Indexes:**
- UNIQUE KEY `IDX_course_program_code` (`code`)
- KEY `IDX_course_program_active` (`is_active`)

**Relationships:**
- 1:N → course_step
- 1:N → course_bundle_component
- 1:N → student_course_enrollment

### 2. course_step
Ordered steps within a course program with content and sequencing info.

**Columns:**
- `id` int PK AUTO_INCREMENT
- `course_program_id` int NOT NULL - FK to course_program.id
- `step_order` smallint unsigned NOT NULL - Ordering within course (1, 2, 3...)
- `label` varchar(100) NOT NULL - Step label (e.g., "SFZ-1", "Foundation")
- `title` varchar(255) NOT NULL - Step title
- `description` text NULL - Step content/overview
- `is_required` tinyint(1) NOT NULL DEFAULT 1 - Whether step must be completed
- `created_at`, `updated_at`, `deleted_at` (from BaseEntity)

**Indexes:**
- KEY `IDX_course_step_program_order` (`course_program_id`, `step_order`)
- UNIQUE KEY `IDX_course_step_program_label` (`course_program_id`, `label`)

**Relationships:**
- N:1 → course_program
- 1:N → course_step_option

### 3. course_step_option
Links course steps to available group class options (many-to-many relationship).

**Columns:**
- `id` int PK AUTO_INCREMENT
- `course_step_id` int NOT NULL - FK to course_step.id
- `group_class_id` int NOT NULL - FK to group_class.id
- `is_active` tinyint(1) NOT NULL DEFAULT 1 - Whether this option is available
- `created_at`, `updated_at`, `deleted_at` (from BaseEntity)

**Indexes:**
- UNIQUE KEY `IDX_course_step_option_unique` (`course_step_id`, `group_class_id`)
- KEY `IDX_course_step_option_step` (`course_step_id`)
- KEY `IDX_course_step_option_class` (`group_class_id`)

**Relationships:**
- N:1 → course_step
- N:1 → group_class

### 4. course_bundle_component
Defines bundled extras included with course purchase (private credits, additional groups).

**Columns:**
- `id` int PK AUTO_INCREMENT
- `course_program_id` int NOT NULL - FK to course_program.id
- `component_type` enum('PRIVATE_CREDIT','GROUP_CREDIT') NOT NULL - Type of bundled component
- `quantity` smallint unsigned NOT NULL DEFAULT 1 - Number of credits/items
- `description` varchar(255) NULL - Human-readable description
- `metadata` json NULL - Additional configuration (package IDs, etc.)
- `created_at`, `updated_at`, `deleted_at` (from BaseEntity)

**Indexes:**
- KEY `IDX_course_bundle_program` (`course_program_id`)

**Relationships:**
- N:1 → course_program

### 5. student_course_enrollment
Student purchase records for course programs with Stripe fulfillment tracking.

**Columns:**
- `id` int PK AUTO_INCREMENT
- `course_program_id` int NOT NULL - FK to course_program.id
- `student_id` int NOT NULL - FK to student.id
- `stripe_payment_intent_id` varchar(255) NOT NULL - Stripe payment intent ID
- `stripe_product_id` varchar(255) NOT NULL - Stripe product ID at time of purchase
- `stripe_price_id` varchar(255) NOT NULL - Stripe price ID at time of purchase
- `status` enum('ACTIVE','CANCELLED','REFUNDED') NOT NULL DEFAULT 'ACTIVE'
- `purchased_at` datetime(3) NOT NULL - Purchase timestamp
- `cancelled_at` datetime(3) NULL - Cancellation timestamp
- `refunded_at` datetime(3) NULL - Refund timestamp
- `metadata` json NULL - Additional fulfillment data
- `created_at`, `updated_at`, `deleted_at` (from BaseEntity)

**Indexes:**
- UNIQUE KEY `IDX_student_course_enrollment_unique` (`course_program_id`, `student_id`)
- KEY `IDX_student_course_enrollment_student` (`student_id`)
- KEY `IDX_student_course_enrollment_payment` (`stripe_payment_intent_id`)

**Relationships:**
- N:1 → course_program
- N:1 → student
- 1:N → student_course_progress

### 6. student_course_progress
Tracks student progress through course steps and credit consumption.

**Columns:**
- `id` int PK AUTO_INCREMENT
- `student_course_enrollment_id` int NOT NULL - FK to student_course_enrollment.id
- `course_step_id` int NOT NULL - FK to course_step.id
- `selected_option_id` int NULL - FK to course_step_option.id (chosen class option)
- `status` enum('UNBOOKED','BOOKED','COMPLETED','MISSED','CANCELLED') NOT NULL DEFAULT 'UNBOOKED'
- `booked_at` datetime(3) NULL - When student booked this step
- `completed_at` datetime(3) NULL - When step was completed
- `cancelled_at` datetime(3) NULL - When booking was cancelled
- `session_id` int NULL - FK to session.id (actual booked session)
- `credit_consumed` tinyint(1) NOT NULL DEFAULT 0 - Whether course entitlement was used
- `created_at`, `updated_at`, `deleted_at` (from BaseEntity)

**Indexes:**
- UNIQUE KEY `IDX_student_course_progress_unique` (`student_course_enrollment_id`, `course_step_id`)
- KEY `IDX_student_course_progress_enrollment` (`student_course_enrollment_id`)
- KEY `IDX_student_course_progress_step` (`course_step_id`)
- KEY `IDX_student_course_progress_session` (`session_id`)

**Relationships:**
- N:1 → student_course_enrollment
- N:1 → course_step
- N:1 → course_step_option (selected_option_id)
- N:1 → session

## Entity Relationship Diagram

```
course_program (1) ──── (N) course_step
    │                           │
    │                           │
    └─ (N) course_bundle_component  │
                                    │
                                    │
                                    └─ (N) course_step_option (N) ─── group_class
                                        │
                                        │
                                        │
student (1) ─── (N) student_course_enrollment (1) ─── (N) student_course_progress
                                                            │
                                                            │
                                                            └─ (N:1) course_step
```

## Migration Strategy

### Phase 1: Core Tables
Create tables in this order to satisfy FK dependencies:
1. `course_program` (no dependencies)
2. `course_step` (depends on course_program)
3. `course_bundle_component` (depends on course_program)
4. `course_step_option` (depends on course_step, references existing `group_class`)
5. `student_course_enrollment` (depends on course_program, references existing `student`)
6. `student_course_progress` (depends on student_course_enrollment, course_step, course_step_option, references existing `session`)

### Phase 2: Backfill Strategy
**No backfill required for existing data:**
- Existing `group_class` records remain independent and can be linked to course steps via `course_step_option` during admin setup
- Existing `student` records will be referenced by new `student_course_enrollment` records when students purchase courses
- Existing `session` records will be referenced by `student_course_progress` when students book course sessions
- Course programs start empty and are populated through the admin interface

**Migration Safety:**
- All new tables use soft deletes (`deleted_at`) consistent with existing schema
- Foreign key constraints use appropriate CASCADE/RESTRICT rules
- No existing data modifications required
- Rollback possible by dropping new tables in reverse order

### Phase 3: Indexes & Constraints
Add all indexes and constraints as specified in the ERD after table creation to ensure optimal performance from the start.

## Naming Convention Validation

✅ **Consistent with existing schema:**
- Snake_case column names
- Singular table names
- Standard BaseEntity fields (created_at, updated_at, deleted_at)
- Enum types for status fields
- Proper FK naming (`{table}_{column}`)

✅ **No conflicts with existing tables:**
- `course_program` vs existing `course` (different concepts)
- `student_course_*` prefix for course-specific student data
- Reuses existing `group_class`, `student`, `session` tables

## Data Integrity Rules

1. **Step Ordering**: `course_step.step_order` must be unique within each course_program
2. **Step Labels**: `course_step.label` must be unique within each course_program
3. **Single Active Option**: Student can only have one active booking per course step
4. **Credit Consumption**: Once `credit_consumed = 1`, progress status cannot change
5. **Enrollment Status**: Cancelled enrollments prevent new bookings but preserve history