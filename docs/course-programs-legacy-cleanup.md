# Course Programs: Legacy Cleanup Plan

## Overview
This document outlines the cleanup of the legacy "course" system to make way for the new "course-programs" feature. The legacy system is no longer needed and can be safely removed.

---

## Legacy System Components to Remove

### Database Tables (via migration)
- `course` - Simple course container
- `course_enrollment` - Student enrollments to courses
- `course_teacher` - Many-to-many teacher-course junction

### Entity Files to Delete
1. `/apps/nestjs/src/courses/entities/course.entity.ts`
2. `/apps/nestjs/src/enrollments/entities/course-enrollment.entity.ts`
3. `/apps/nestjs/src/course-teachers/entities/course-teacher.entity.ts`

### Directory Cleanup
- Remove `/apps/nestjs/src/courses/` directory entirely (Admin entity already moved)
- Remove `/apps/nestjs/src/enrollments/` directory (only contained CourseEnrollment)
- Remove `/apps/nestjs/src/course-teachers/` directory

---

## Files Requiring Modifications

### 1. Entity Exports (`/apps/nestjs/src/entities.ts`)

**Remove these lines:**
```typescript
export { Course } from "./courses/entities/course.entity.js";
export { CourseTeacher } from "./course-teachers/entities/course-teacher.entity.js";
export { CourseEnrollment } from "./enrollments/entities/course-enrollment.entity.js";
export { Admin } from "./courses/entities/admin.entity.js";
```

**Add this line** (Admin moved):
```typescript
export { Admin } from "./users/entities/admin.entity.js";
```

---

### 2. Session Entity (`/apps/nestjs/src/sessions/entities/session.entity.ts`)

**Remove:**
- `courseId` column definition
- `course` ManyToOne relation
- Type import for Course

**Before:**
```typescript
import type { Course } from "../../courses/entities/course.entity.js";

@Column({
  name: "course_id",
  type: "int",
  nullable: true,
  comment: "FK to course.id (if session belongs to a course)",
})
courseId: number | null;

@ManyToOne("Course", "sessions")
@JoinColumn({ name: "course_id" })
course: Course | null;
```

**After:**
```typescript
// Remove all course-related fields
// Sessions now only relate to CoursePrograms via GroupClass → CourseStepOption
```

**Note:** Verify no service logic depends on `session.courseId` before removal.

---

### 3. Student Entity (`/apps/nestjs/src/students/entities/student.entity.ts`)

**Remove:**
- `courseEnrollments` OneToMany relation
- Type import for CourseEnrollment

**Before:**
```typescript
import type { CourseEnrollment } from "../../enrollments/entities/course-enrollment.entity.js";

@OneToMany("CourseEnrollment", "student")
courseEnrollments: CourseEnrollment[];
```

**After:**
```typescript
// Remove courseEnrollments relation
// Students now relate to courses via StudentCourseEnrollment
```

---

### 4. Teacher Entity (`/apps/nestjs/src/teachers/entities/teacher.entity.ts`)

**Remove:**
- `courseTeachers` OneToMany relation
- Type import for CourseTeacher

**Before:**
```typescript
import type { CourseTeacher } from "../../course-teachers/entities/course-teacher.entity.js";

@OneToMany("CourseTeacher", "teacher")
courseTeachers: CourseTeacher[];
```

**After:**
```typescript
// Remove courseTeachers relation
// Teachers now relate to courses via GroupClassTeacher → GroupClass → CourseStepOption
```

---

### 5. Students Service (`/apps/nestjs/src/students/students.service.ts`)

**Remove entire method:**
```typescript
async getStudentEnrollments(studentId: number) {
  // This method queries course_enrollment table
  // Remove entirely - will be replaced by CourseProgram enrollment logic
}
```

**Update `getStudentStats()` method:**

**Before:**
```typescript
const activeCourses = await this.dataSource
  .getRepository(CourseEnrollment)
  .count({
    where: { studentId, status: 'ACTIVE' }
  });

return { ...otherStats, activeCourses };
```

**After:**
```typescript
const activeCourses = await this.dataSource
  .getRepository(StudentCourseEnrollment)
  .count({
    where: { studentId, status: 'ACTIVE' }
  });

return { ...otherStats, activeCourses };
```

**Remove imports:**
```typescript
// Remove
import { CourseEnrollment } from "../enrollments/entities/course-enrollment.entity.js";

// Add
import { StudentCourseEnrollment } from "../course-programs/entities/student-course-enrollment.entity.js";
```

**Update interfaces:**
```typescript
// Remove
interface CourseEnrollmentResult {
  id: number;
  courseId: number;
  courseName: string;
  status: string;
}

// Not needed anymore - use StudentCourseEnrollment entity directly
```

---

### 6. Students Controller (`/apps/nestjs/src/students/students.controller.ts`)

**Remove endpoint:**
```typescript
@Get('me/enrollments')
@UseGuards(JwtAuthGuard, StudentGuard)
async getMyEnrollments(@CurrentUser() user: User) {
  const student = await this.studentsService.findOneByUserId(user.id);
  return this.studentsService.getStudentEnrollments(student.id);
}
```

**Note:** This endpoint will be replaced by the new CourseProgram enrollment endpoint in the course-programs module.

---

### 7. Students Module (`/apps/nestjs/src/students/students.module.ts`)

**Remove from TypeOrmModule.forFeature():**
```typescript
TypeOrmModule.forFeature([
  Student,
  Course,          // REMOVE
  CourseEnrollment // REMOVE
])
```

**After:**
```typescript
TypeOrmModule.forFeature([
  Student
])
```

---

### 8. Packages Service (`/apps/nestjs/src/packages/packages.service.ts`)

**Search for `requiresCourseEnrollment` logic:**

If present, remove or refactor to use `StudentCourseEnrollment`:

**Before:**
```typescript
if (session.type === ServiceType.COURSE && !session.courseId) {
  throw new BadRequestException('Course sessions must have a courseId');
}

// Check course enrollment
const enrollment = await this.courseEnrollmentRepo.findOne({
  where: { studentId, courseId: session.courseId, status: 'ACTIVE' }
});
```

**After:**
```typescript
// Course sessions now checked via CourseStepOption relationship
// This logic moves to course-programs booking validation
```

---

### 9. Admin Entity Imports (Already moved by user)

**Files that import Admin need path updates:**

These files should now import from `"../users/entities/admin.entity.js"`:
- `/apps/nestjs/src/auth/auth.module.ts`
- `/apps/nestjs/src/auth/auth.service.ts`
- `/apps/nestjs/src/auth/auth.service.spec.ts`
- `/apps/nestjs/src/users/users.module.ts`
- `/apps/nestjs/src/users/users.service.ts`
- `/apps/nestjs/src/users/users.service.spec.ts`
- `/apps/nestjs/src/users/dto/user-response.dto.ts`
- `/apps/nestjs/src/policies/policies.module.ts`

**Note:** User indicated this is already done.

---

## Database Migration

### Create Migration: `RemoveLegacyCourseTables`

**File:** `/apps/nestjs/src/migrations/[timestamp]-RemoveLegacyCourseTables.ts`

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveLegacyCourseTables[TIMESTAMP] implements MigrationInterface {
  name = "RemoveLegacyCourseTables[TIMESTAMP]";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS course_enrollment`);
    await queryRunner.query(`DROP TABLE IF EXISTS course_teacher`);
    await queryRunner.query(`DROP TABLE IF EXISTS course`);

    // Remove session.course_id column
    await queryRunner.query(`ALTER TABLE session DROP FOREIGN KEY IF EXISTS FK_session_course`);
    await queryRunner.query(`ALTER TABLE session DROP COLUMN IF EXISTS course_id`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate course table
    await queryRunner.query(`
      CREATE TABLE course (
        id INT PRIMARY KEY AUTO_INCREMENT,
        slug VARCHAR(191) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        enrollment_opens_at DATETIME(3) NULL,
        enrollment_closes_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        INDEX idx_course_slug (slug),
        INDEX idx_course_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Recreate course_teacher table
    await queryRunner.query(`
      CREATE TABLE course_teacher (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_id INT NOT NULL,
        teacher_id INT NOT NULL,
        role VARCHAR(100) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE CASCADE,
        UNIQUE KEY idx_course_teacher_unique (course_id, teacher_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Recreate course_enrollment table
    await queryRunner.query(`
      CREATE TABLE course_enrollment (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_id INT NOT NULL,
        student_id INT NOT NULL,
        status ENUM('ACTIVE', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
        enrolled_at DATETIME(3) NOT NULL,
        completed_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
        UNIQUE KEY idx_course_enrollment_unique (course_id, student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Restore session.course_id column
    await queryRunner.query(`
      ALTER TABLE session
      ADD COLUMN course_id INT NULL
      COMMENT 'FK to course.id (if session belongs to a course)'
    `);
    await queryRunner.query(`
      ALTER TABLE session
      ADD CONSTRAINT FK_session_course
      FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE SET NULL
    `);
  }
}
```

---

## Testing Checklist

Before deploying the cleanup:

- [ ] Verify no production data exists in `course`, `course_enrollment`, `course_teacher` tables
- [ ] Run TypeScript build to catch any import errors
- [ ] Run all tests to ensure no dependencies on legacy entities
- [ ] Test that `GET /students/me` endpoint works (uses getStudentStats)
- [ ] Verify migration runs cleanly in development environment
- [ ] Check that no WordPress/frontend code references legacy endpoints

---

## Rollback Plan

If issues are discovered after cleanup:

1. **Revert migration:** Run migration down to restore tables
2. **Restore entity files:** Git revert the deletion commits
3. **Restore imports:** Revert import path changes
4. **Restore endpoints:** Revert controller/service changes

**Recommendation:** Create a feature branch for this cleanup and test thoroughly before merging to main.

---

## Timeline Estimate

- Entity/file removal: 30 minutes
- Import path updates: 45 minutes
- Migration creation: 30 minutes
- Testing: 1-2 hours
- **Total:** ~3-4 hours

---

## Dependencies

This cleanup should be completed BEFORE implementing the new course-programs features to avoid confusion and naming conflicts.

**Next Steps:** After cleanup is complete, proceed with:
1. Running the AddCourseProgramsTables migration
2. Implementing CourseProgram DTOs and services
3. Building admin interface for course management
