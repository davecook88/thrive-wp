# Database Schema - Course Student View

## Overview

This document details all database schema changes required for the course student view and cohort-based enrollment system.

## New Entities

### CourseCohort Entity

**Purpose:** Represents a pre-packaged set of sessions that students enroll in as a group. Each cohort has its own start date, capacity, and enrollment deadline.

**File Location:** `/apps/nestjs/src/course-programs/entities/course-cohort.entity.ts`

**Table Name:** `course_cohort`

#### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | int | PRIMARY KEY, AUTO_INCREMENT | Cohort unique identifier |
| `course_program_id` | int | NOT NULL, FK → course_program.id | Parent course |
| `name` | varchar(255) | NOT NULL | Cohort display name (e.g., "Fall 2025 Cohort") |
| `description` | text | NULLABLE | Optional cohort-specific description |
| `start_date` | date | NOT NULL | First session date of cohort |
| `end_date` | date | NOT NULL | Last session date of cohort |
| `timezone` | varchar(64) | NOT NULL | Timezone for cohort (inherits from course by default) |
| `max_enrollment` | smallint | NOT NULL, UNSIGNED | Maximum students allowed in cohort |
| `current_enrollment` | smallint | NOT NULL, UNSIGNED, DEFAULT 0 | Current enrolled count (updated by trigger/code) |
| `enrollment_deadline` | datetime | NULLABLE | Last datetime student can enroll (defaults to start_date) |
| `is_active` | tinyint(1) | NOT NULL, DEFAULT 1 | Whether cohort is available for enrollment |
| `created_at` | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation |
| `updated_at` | timestamp | NOT NULL, ON UPDATE CURRENT_TIMESTAMP | Last update |

#### Indexes

```sql
INDEX idx_course_program_id (course_program_id)
INDEX idx_start_date (start_date)
INDEX idx_is_active (is_active)
INDEX idx_enrollment_status (is_active, enrollment_deadline, current_enrollment, max_enrollment)
```

#### Relationships

- **ManyToOne:** CourseCohort → CourseProgram
- **OneToMany:** CourseCohort → CourseCohortSession
- **OneToMany:** CourseCohort → StudentCourseStepProgress

#### TypeORM Entity Definition

```typescript
@Entity("course_cohort")
@Index(["courseProgramId"])
@Index(["startDate"])
@Index(["isActive"])
export class CourseCohort extends BaseEntity {
  @Column({ name: "course_program_id", type: "int" })
  courseProgramId: number;

  @ManyToOne(() => CourseProgram, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_program_id" })
  courseProgram: CourseProgram;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @Column({ name: "start_date", type: "date" })
  startDate: string;

  @Column({ name: "end_date", type: "date" })
  endDate: string;

  @Column({ name: "timezone", type: "varchar", length: 64, default: "America/New_York" })
  timezone: string;

  @Column({ name: "max_enrollment", type: "smallint", unsigned: true })
  maxEnrollment: number;

  @Column({ name: "current_enrollment", type: "smallint", unsigned: true, default: 0 })
  currentEnrollment: number;

  @Column({ name: "enrollment_deadline", type: "datetime", nullable: true })
  enrollmentDeadline: Date | null;

  @Column({ name: "is_active", type: "tinyint", width: 1, default: 1 })
  isActive: boolean;

  @OneToMany(() => CourseCohortSession, (session) => session.cohort)
  cohortSessions: CourseCohortSession[];

  @OneToMany(() => StudentCourseStepProgress, (progress) => progress.cohort)
  studentProgress: StudentCourseStepProgress[];
}
```

---

### CourseCohortSession Join Table

**Purpose:** Links a cohort to specific CourseStepOption sessions, defining which sessions are part of which cohort.

**File Location:** `/apps/nestjs/src/course-programs/entities/course-cohort-session.entity.ts`

**Table Name:** `course_cohort_session`

#### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | int | PRIMARY KEY, AUTO_INCREMENT | Join record identifier |
| `cohort_id` | int | NOT NULL, FK → course_cohort.id | Parent cohort |
| `course_step_id` | int | NOT NULL, FK → course_step.id | Which step this session fulfills |
| `course_step_option_id` | int | NOT NULL, FK → course_step_option.id | Specific session option selected |
| `created_at` | timestamp | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation |

#### Indexes

```sql
UNIQUE INDEX idx_cohort_step_option (cohort_id, course_step_id, course_step_option_id)
INDEX idx_cohort_id (cohort_id)
INDEX idx_course_step_option_id (course_step_option_id)
```

#### Relationships

- **ManyToOne:** CourseCohortSession → CourseCohort
- **ManyToOne:** CourseCohortSession → CourseStep
- **ManyToOne:** CourseCohortSession → CourseStepOption

#### TypeORM Entity Definition

```typescript
@Entity("course_cohort_session")
@Index(["cohortId", "courseStepId", "courseStepOptionId"], { unique: true })
@Index(["cohortId"])
@Index(["courseStepOptionId"])
export class CourseCohortSession extends BaseEntity {
  @Column({ name: "cohort_id", type: "int" })
  cohortId: number;

  @ManyToOne(() => CourseCohort, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cohort_id" })
  cohort: CourseCohort;

  @Column({ name: "course_step_id", type: "int" })
  courseStepId: number;

  @ManyToOne(() => CourseStep, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_step_id" })
  courseStep: CourseStep;

  @Column({ name: "course_step_option_id", type: "int" })
  courseStepOptionId: number;

  @ManyToOne(() => CourseStepOption, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_step_option_id" })
  courseStepOption: CourseStepOption;
}
```

---

## Modified Entities

### CourseProgram - Add Fields

**File Location:** `/apps/nestjs/src/course-programs/entities/course-program.entity.ts`

#### New Fields

```typescript
@Column({
  name: "hero_image_url",
  type: "varchar",
  length: 512,
  nullable: true,
  comment: "URL to course hero image (placeholder support)"
})
heroImageUrl: string | null;

@Column({
  name: "slug",
  type: "varchar",
  length: 100,
  nullable: true,
  unique: true,
  comment: "URL-friendly slug (future migration from code-based URLs)"
})
slug: string | null;
```

#### New Index

```sql
UNIQUE INDEX idx_slug (slug)
```

#### Migration Notes

- Add fields with `nullable: true` to support existing courses
- `slug` can remain null; system uses `code` for URLs currently
- Future migration can populate slugs and switch URL pattern

---

### StudentCourseStepProgress - Add Cohort Reference

**File Location:** `/apps/nestjs/src/course-programs/entities/student-course-step-progress.entity.ts`

#### New Field

```typescript
@Column({
  name: "cohort_id",
  type: "int",
  nullable: true,
  comment: "Which cohort student enrolled in (null for legacy enrollments)"
})
cohortId: number | null;

@ManyToOne(() => CourseCohort, { onDelete: "SET NULL" })
@JoinColumn({ name: "cohort_id" })
cohort: CourseCohort | null;
```

#### New Index

```sql
INDEX idx_cohort_id (cohort_id)
```

#### Migration Notes

- Add field with `nullable: true` to support existing progress records
- Legacy enrollments without cohort can continue functioning
- New enrollments must specify cohortId

---

## TypeORM Migration

**File Location:** `/apps/nestjs/src/migrations/YYYYMMDDHHMMSS-add-course-cohorts.ts`

### Migration Template

```typescript
import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex, TableForeignKey } from "typeorm";

export class AddCourseCohorts1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create course_cohort table
    await queryRunner.createTable(
      new Table({
        name: "course_cohort",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "course_program_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "start_date",
            type: "date",
            isNullable: false,
          },
          {
            name: "end_date",
            type: "date",
            isNullable: false,
          },
          {
            name: "timezone",
            type: "varchar",
            length: "64",
            isNullable: false,
            default: "'America/New_York'",
          },
          {
            name: "max_enrollment",
            type: "smallint",
            isNullable: false,
            unsigned: true,
          },
          {
            name: "current_enrollment",
            type: "smallint",
            isNullable: false,
            unsigned: true,
            default: 0,
          },
          {
            name: "enrollment_deadline",
            type: "datetime",
            isNullable: true,
          },
          {
            name: "is_active",
            type: "tinyint",
            width: 1,
            isNullable: false,
            default: 1,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ["course_program_id"],
            referencedTableName: "course_program",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
        indices: [
          {
            name: "idx_course_program_id",
            columnNames: ["course_program_id"],
          },
          {
            name: "idx_start_date",
            columnNames: ["start_date"],
          },
          {
            name: "idx_is_active",
            columnNames: ["is_active"],
          },
        ],
      }),
      true
    );

    // 2. Create course_cohort_session table
    await queryRunner.createTable(
      new Table({
        name: "course_cohort_session",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "cohort_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "course_step_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "course_step_option_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ["cohort_id"],
            referencedTableName: "course_cohort",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
          {
            columnNames: ["course_step_id"],
            referencedTableName: "course_step",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
          {
            columnNames: ["course_step_option_id"],
            referencedTableName: "course_step_option",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
        indices: [
          {
            name: "idx_cohort_step_option",
            columnNames: ["cohort_id", "course_step_id", "course_step_option_id"],
            isUnique: true,
          },
          {
            name: "idx_cohort_id",
            columnNames: ["cohort_id"],
          },
          {
            name: "idx_course_step_option_id",
            columnNames: ["course_step_option_id"],
          },
        ],
      }),
      true
    );

    // 3. Add hero_image_url and slug to course_program
    await queryRunner.addColumn(
      "course_program",
      new TableColumn({
        name: "hero_image_url",
        type: "varchar",
        length: "512",
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      "course_program",
      new TableColumn({
        name: "slug",
        type: "varchar",
        length: "100",
        isNullable: true,
        isUnique: true,
      })
    );

    // 4. Add cohort_id to student_course_step_progress
    await queryRunner.addColumn(
      "student_course_step_progress",
      new TableColumn({
        name: "cohort_id",
        type: "int",
        isNullable: true,
      })
    );

    await queryRunner.createIndex(
      "student_course_step_progress",
      new TableIndex({
        name: "idx_cohort_id",
        columnNames: ["cohort_id"],
      })
    );

    await queryRunner.createForeignKey(
      "student_course_step_progress",
      new TableForeignKey({
        columnNames: ["cohort_id"],
        referencedTableName: "course_cohort",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse operations in opposite order
    const progressTable = await queryRunner.getTable("student_course_step_progress");
    const cohortFk = progressTable.foreignKeys.find(fk => fk.columnNames.indexOf("cohort_id") !== -1);
    if (cohortFk) {
      await queryRunner.dropForeignKey("student_course_step_progress", cohortFk);
    }

    await queryRunner.dropIndex("student_course_step_progress", "idx_cohort_id");
    await queryRunner.dropColumn("student_course_step_progress", "cohort_id");

    await queryRunner.dropColumn("course_program", "slug");
    await queryRunner.dropColumn("course_program", "hero_image_url");

    await queryRunner.dropTable("course_cohort_session");
    await queryRunner.dropTable("course_cohort");
  }
}
```

---

## Data Integrity Constraints

### Business Rules Enforced at Database Level

1. **Unique Cohort Name per Course**
   - Add constraint: `UNIQUE(course_program_id, name)`
   - Prevents duplicate cohort names within same course

2. **Enrollment Cannot Exceed Capacity**
   - Use CHECK constraint: `current_enrollment <= max_enrollment` (MySQL 8.0.16+)
   - Or enforce in application code with transaction locking

3. **End Date After Start Date**
   - CHECK constraint: `end_date >= start_date`

4. **Unique Step per Cohort**
   - Already enforced by unique index on `course_cohort_session(cohort_id, course_step_id, course_step_option_id)`
   - Ensures each step has exactly one option assigned per cohort

### Migration Update for Constraints

```typescript
// Add to up() migration after creating course_cohort table
await queryRunner.query(`
  ALTER TABLE course_cohort
  ADD CONSTRAINT chk_enrollment_capacity
  CHECK (current_enrollment <= max_enrollment)
`);

await queryRunner.query(`
  ALTER TABLE course_cohort
  ADD CONSTRAINT chk_date_order
  CHECK (end_date >= start_date)
`);

await queryRunner.query(`
  ALTER TABLE course_cohort
  ADD CONSTRAINT uniq_course_cohort_name
  UNIQUE (course_program_id, name)
`);
```

---

## Sample Data

### Example CourseCohort Records

```sql
INSERT INTO course_cohort (course_program_id, name, description, start_date, end_date, timezone, max_enrollment, enrollment_deadline, is_active)
VALUES
  (1, 'Fall 2025 Cohort', 'Our fall semester starting in September', '2025-09-15', '2025-12-15', 'America/New_York', 30, '2025-09-14 23:59:59', 1),
  (1, 'Spring 2026 Cohort', 'Spring semester beginning in January', '2026-01-20', '2026-04-30', 'America/New_York', 30, '2026-01-19 23:59:59', 1),
  (2, 'Summer Intensive 2025', 'Accelerated summer program', '2025-06-01', '2025-08-15', 'America/Los_Angeles', 20, '2025-05-25 23:59:59', 1);
```

### Example CourseCohortSession Records

```sql
-- Fall 2025 Cohort for Course ID 1
-- Step 1: Monday 6pm option
INSERT INTO course_cohort_session (cohort_id, course_step_id, course_step_option_id)
VALUES (1, 1, 3);

-- Step 2: Monday 6pm option (same time slot, different class)
INSERT INTO course_cohort_session (cohort_id, course_step_id, course_step_option_id)
VALUES (1, 2, 7);

-- Step 3: Wednesday 6pm option
INSERT INTO course_cohort_session (cohort_id, course_step_id, course_step_option_id)
VALUES (1, 3, 12);
```

---

## Query Patterns

### Get Available Cohorts for a Course

```sql
SELECT
  c.*,
  cp.code AS course_code,
  cp.title AS course_title,
  (c.max_enrollment - c.current_enrollment) AS available_spots
FROM course_cohort c
INNER JOIN course_program cp ON c.course_program_id = cp.id
WHERE cp.code = 'SFZ'
  AND c.is_active = 1
  AND (c.enrollment_deadline IS NULL OR c.enrollment_deadline > NOW())
  AND c.current_enrollment < c.max_enrollment
ORDER BY c.start_date ASC;
```

### Get All Sessions for a Cohort

```sql
SELECT
  cs.id AS course_step_id,
  cs.step_order,
  cs.label AS step_label,
  cs.title AS step_title,
  cso.id AS course_step_option_id,
  gc.id AS group_class_id,
  gc.name AS class_name,
  gc.day_of_week,
  gc.start_time,
  gc.end_time,
  gc.timezone
FROM course_cohort_session ccs
INNER JOIN course_step cs ON ccs.course_step_id = cs.id
INNER JOIN course_step_option cso ON ccs.course_step_option_id = cso.id
INNER JOIN group_class gc ON cso.group_class_id = gc.id
WHERE ccs.cohort_id = 1
ORDER BY cs.step_order ASC;
```

### Increment Cohort Enrollment (with Locking)

```sql
START TRANSACTION;

-- Lock row for update
SELECT current_enrollment, max_enrollment
FROM course_cohort
WHERE id = 1
FOR UPDATE;

-- Check capacity
-- (Application code checks if current_enrollment < max_enrollment)

-- Increment if capacity available
UPDATE course_cohort
SET current_enrollment = current_enrollment + 1
WHERE id = 1;

COMMIT;
```

---

## Testing Checklist

- [ ] Migration runs successfully on clean database
- [ ] Migration down() correctly reverses changes
- [ ] Foreign key constraints prevent orphaned records
- [ ] Unique constraints prevent duplicate cohort names per course
- [ ] CHECK constraints enforce enrollment capacity
- [ ] Indexes improve query performance (verify with EXPLAIN)
- [ ] Sample data inserts successfully
- [ ] Query patterns return expected results
- [ ] Cohort enrollment increment handles race conditions (test with concurrent requests)

---

## Next Steps

After implementing this schema:
1. Generate TypeScript types from new entities
2. Create service methods for cohort management
3. Build API endpoints (see [02-api-endpoints.md](./02-api-endpoints.md))
4. Add cohort management to admin UI
