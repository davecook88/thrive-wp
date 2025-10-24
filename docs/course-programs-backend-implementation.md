# Course Programs: Backend Implementation Plan

## Overview
This document provides comprehensive implementation details for the NestJS backend components of the course-programs feature, including DTOs, services, controllers, guards, and business logic.

---

## Architecture Overview

### Module Structure
```
apps/nestjs/src/course-programs/
├── entities/                    # ✅ ALREADY EXISTS
│   ├── course-program.entity.ts
│   ├── course-step.entity.ts
│   ├── course-step-option.entity.ts
│   ├── course-bundle-component.entity.ts
│   ├── student-course-enrollment.entity.ts
│   └── student-course-progress.entity.ts
├── dto/                         # ❌ TO CREATE
│   ├── admin/
│   │   ├── create-course-program.dto.ts
│   │   ├── update-course-program.dto.ts
│   │   ├── create-course-step.dto.ts
│   │   ├── update-course-step.dto.ts
│   │   ├── attach-step-option.dto.ts
│   │   ├── create-bundle-component.dto.ts
│   │   └── publish-course.dto.ts
│   ├── public/
│   │   ├── course-program-list.dto.ts
│   │   ├── course-program-detail.dto.ts
│   │   ├── course-step-detail.dto.ts
│   │   └── enrollment-status.dto.ts
│   └── common/
│       └── course-program-response.dto.ts
├── services/                    # ❌ TO CREATE
│   ├── course-programs.service.ts
│   ├── course-steps.service.ts
│   ├── course-enrollments.service.ts
│   └── course-progress.service.ts
├── controllers/                 # ❌ TO CREATE
│   ├── admin-course-programs.controller.ts
│   └── course-programs.controller.ts
├── guards/                      # ❌ TO CREATE
│   └── course-enrollment.guard.ts
└── course-programs.module.ts    # ❌ TO CREATE
```

---

## Phase 1: DTOs and Validation

### 1.1 Admin DTOs

#### `dto/admin/create-course-program.dto.ts`
```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

/**
 * Schema for creating a new course program
 */
export const CreateCourseProgramSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code must not exceed 50 characters')
    .regex(/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens')
    .describe('Human-readable course code (e.g., "SFZ", "ADV-TECH")'),

  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters')
    .describe('Course title'),

  description: z
    .string()
    .max(5000, 'Description must not exceed 5000 characters')
    .optional()
    .nullable()
    .describe('Marketing description'),

  timezone: z
    .string()
    .default('America/New_York')
    .describe('Default timezone for scheduling recommendations'),

  isActive: z
    .boolean()
    .default(true)
    .describe('Whether the course is available for purchase'),
});

export class CreateCourseProgramDto extends createZodDto(CreateCourseProgramSchema) {}

export type CreateCourseProgramInput = z.infer<typeof CreateCourseProgramSchema>;
```

#### `dto/admin/update-course-program.dto.ts`
```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';
import { CreateCourseProgramSchema } from './create-course-program.dto.js';

/**
 * Schema for updating an existing course program
 * All fields are optional for partial updates
 */
export const UpdateCourseProgramSchema = CreateCourseProgramSchema.partial();

export class UpdateCourseProgramDto extends createZodDto(UpdateCourseProgramSchema) {}

export type UpdateCourseProgramInput = z.infer<typeof UpdateCourseProgramSchema>;
```

#### `dto/admin/create-course-step.dto.ts`
```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

/**
 * Schema for creating a course step
 */
export const CreateCourseStepSchema = z.object({
  courseProgramId: z
    .number()
    .int()
    .positive()
    .describe('FK to course_program.id'),

  stepOrder: z
    .number()
    .int()
    .positive()
    .min(1, 'Step order must be at least 1')
    .describe('Ordering within course (1, 2, 3...)'),

  label: z
    .string()
    .min(1, 'Label is required')
    .max(100, 'Label must not exceed 100 characters')
    .describe('Step label (e.g., "SFZ-1", "Foundation")'),

  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters')
    .describe('Step title'),

  description: z
    .string()
    .max(5000, 'Description must not exceed 5000 characters')
    .optional()
    .nullable()
    .describe('Step content/overview'),

  isRequired: z
    .boolean()
    .default(true)
    .describe('Whether step must be completed'),
});

export class CreateCourseStepDto extends createZodDto(CreateCourseStepSchema) {}

export type CreateCourseStepInput = z.infer<typeof CreateCourseStepSchema>;
```

#### `dto/admin/update-course-step.dto.ts`
```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';
import { CreateCourseStepSchema } from './create-course-step.dto.js';

/**
 * Schema for updating a course step
 * courseProgramId is excluded as steps can't be moved between programs
 */
export const UpdateCourseStepSchema = CreateCourseStepSchema
  .omit({ courseProgramId: true })
  .partial();

export class UpdateCourseStepDto extends createZodDto(UpdateCourseStepSchema) {}

export type UpdateCourseStepInput = z.infer<typeof UpdateCourseStepSchema>;
```

#### `dto/admin/attach-step-option.dto.ts`
```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

/**
 * Schema for attaching a group class to a course step
 */
export const AttachStepOptionSchema = z.object({
  courseStepId: z
    .number()
    .int()
    .positive()
    .describe('FK to course_step.id'),

  groupClassId: z
    .number()
    .int()
    .positive()
    .describe('FK to group_class.id'),

  isActive: z
    .boolean()
    .default(true)
    .describe('Whether this option is available for booking'),
});

export class AttachStepOptionDto extends createZodDto(AttachStepOptionSchema) {}

export type AttachStepOptionInput = z.infer<typeof AttachStepOptionSchema>;

/**
 * Schema for detaching (soft deleting) a step option
 */
export const DetachStepOptionSchema = z.object({
  courseStepOptionId: z
    .number()
    .int()
    .positive()
    .describe('ID of course_step_option to remove'),
});

export class DetachStepOptionDto extends createZodDto(DetachStepOptionSchema) {}
```

#### `dto/admin/create-bundle-component.dto.ts`
```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

/**
 * Component types for bundled extras
 */
export const ComponentTypeEnum = z.enum(['PRIVATE_CREDIT', 'GROUP_CREDIT']);

/**
 * Schema for creating a bundle component
 */
export const CreateBundleComponentSchema = z.object({
  courseProgramId: z
    .number()
    .int()
    .positive()
    .describe('FK to course_program.id'),

  componentType: ComponentTypeEnum
    .describe('Type of bundled component'),

  quantity: z
    .number()
    .int()
    .positive()
    .min(1, 'Quantity must be at least 1')
    .describe('Number of credits/items'),

  description: z
    .string()
    .max(255, 'Description must not exceed 255 characters')
    .optional()
    .nullable()
    .describe('Human-readable description'),

  metadata: z
    .record(z.any())
    .optional()
    .nullable()
    .describe('Additional configuration (package tier, etc.)'),
});

export class CreateBundleComponentDto extends createZodDto(CreateBundleComponentSchema) {}

export type CreateBundleComponentInput = z.infer<typeof CreateBundleComponentSchema>;
```

#### `dto/admin/publish-course.dto.ts`
```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

/**
 * Schema for publishing a course to Stripe
 */
export const PublishCourseSchema = z.object({
  courseProgramId: z
    .number()
    .int()
    .positive()
    .describe('Course program to publish'),

  priceInCents: z
    .number()
    .int()
    .positive()
    .describe('Price in cents (e.g., 49900 for $499.00)'),

  currency: z
    .string()
    .length(3)
    .default('usd')
    .describe('ISO currency code'),

  stripePriceMetadata: z
    .record(z.string())
    .optional()
    .describe('Additional Stripe price metadata'),
});

export class PublishCourseDto extends createZodDto(PublishCourseSchema) {}

export type PublishCourseInput = z.infer<typeof PublishCourseSchema>;
```

---

### 1.2 Public DTOs

#### `dto/public/course-program-list.dto.ts`
```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

/**
 * Response schema for course program list view
 */
export const CourseProgramListItemSchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  timezone: z.string(),
  isActive: z.boolean(),
  stepCount: z.number().describe('Number of steps in this course'),
  priceInCents: z.number().nullable().describe('Price in cents if published'),
  stripePriceId: z.string().nullable(),
});

export class CourseProgramListItemDto extends createZodDto(CourseProgramListItemSchema) {}

/**
 * Paginated list response
 */
export const CourseProgramListResponseSchema = z.object({
  items: z.array(CourseProgramListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export class CourseProgramListResponseDto extends createZodDto(CourseProgramListResponseSchema) {}
```

#### `dto/public/course-program-detail.dto.ts`
```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

/**
 * Step option detail (group class schedule info)
 */
export const StepOptionDetailSchema = z.object({
  id: z.number(),
  groupClassId: z.number(),
  groupClassName: z.string(),
  isActive: z.boolean(),
  // Include relevant GroupClass fields
  dayOfWeek: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
  maxStudents: z.number().optional(),
  currentEnrollment: z.number().optional(),
  availableSeats: z.number().optional(),
});

export class StepOptionDetailDto extends createZodDto(StepOptionDetailSchema) {}

/**
 * Step detail with options
 */
export const CourseStepDetailSchema = z.object({
  id: z.number(),
  stepOrder: z.number(),
  label: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  isRequired: z.boolean(),
  options: z.array(StepOptionDetailSchema),
});

export class CourseStepDetailDto extends createZodDto(CourseStepDetailSchema) {}

/**
 * Bundle component detail
 */
export const BundleComponentDetailSchema = z.object({
  id: z.number(),
  componentType: z.enum(['PRIVATE_CREDIT', 'GROUP_CREDIT']),
  quantity: z.number(),
  description: z.string().nullable(),
});

export class BundleComponentDetailDto extends createZodDto(BundleComponentDetailSchema) {}

/**
 * Full course program detail
 */
export const CourseProgramDetailSchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  timezone: z.string(),
  isActive: z.boolean(),
  stripeProductId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
  priceInCents: z.number().nullable(),
  steps: z.array(CourseStepDetailSchema),
  bundleComponents: z.array(BundleComponentDetailSchema),
});

export class CourseProgramDetailDto extends createZodDto(CourseProgramDetailSchema) {}
```

#### `dto/public/enrollment-status.dto.ts`
```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

/**
 * Student's progress for a single step
 */
export const StepProgressSchema = z.object({
  courseStepId: z.number(),
  stepLabel: z.string(),
  stepTitle: z.string(),
  status: z.enum(['UNBOOKED', 'BOOKED', 'COMPLETED', 'MISSED', 'CANCELLED']),
  bookedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  sessionId: z.number().nullable(),
  sessionStartTime: z.date().nullable(),
});

export class StepProgressDto extends createZodDto(StepProgressSchema) {}

/**
 * Student's enrollment status for a course
 */
export const EnrollmentStatusSchema = z.object({
  isEnrolled: z.boolean(),
  enrollmentId: z.number().nullable(),
  status: z.enum(['ACTIVE', 'CANCELLED', 'REFUNDED']).nullable(),
  purchasedAt: z.date().nullable(),
  progress: z.array(StepProgressSchema),
  completedSteps: z.number().describe('Count of completed steps'),
  totalSteps: z.number().describe('Total steps in course'),
});

export class EnrollmentStatusDto extends createZodDto(EnrollmentStatusSchema) {}
```

---

## Phase 2: Services

### 2.1 Course Programs Service

#### `services/course-programs.service.ts`
```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CourseProgram } from '../entities/course-program.entity.js';
import { CreateCourseProgramInput, UpdateCourseProgramInput } from '../dto/admin/index.js';

@Injectable()
export class CourseProgramsService {
  constructor(
    @InjectRepository(CourseProgram)
    private readonly courseProgramRepo: Repository<CourseProgram>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new course program
   */
  async create(input: CreateCourseProgramInput): Promise<CourseProgram> {
    // Check for duplicate code
    const existing = await this.courseProgramRepo.findOne({
      where: { code: input.code },
    });

    if (existing) {
      throw new ConflictException(`Course program with code "${input.code}" already exists`);
    }

    const courseProgram = this.courseProgramRepo.create(input);
    return this.courseProgramRepo.save(courseProgram);
  }

  /**
   * Update an existing course program
   */
  async update(id: number, input: UpdateCourseProgramInput): Promise<CourseProgram> {
    const courseProgram = await this.findOneOrFail(id);

    // Check for duplicate code if changing
    if (input.code && input.code !== courseProgram.code) {
      const existing = await this.courseProgramRepo.findOne({
        where: { code: input.code },
      });

      if (existing) {
        throw new ConflictException(`Course program with code "${input.code}" already exists`);
      }
    }

    Object.assign(courseProgram, input);
    return this.courseProgramRepo.save(courseProgram);
  }

  /**
   * Find course program by ID with relations
   */
  async findOne(id: number, includeRelations = false): Promise<CourseProgram | null> {
    const queryBuilder = this.courseProgramRepo
      .createQueryBuilder('cp')
      .where('cp.id = :id', { id });

    if (includeRelations) {
      queryBuilder
        .leftJoinAndSelect('cp.steps', 'step')
        .leftJoinAndSelect('step.stepOptions', 'option')
        .leftJoinAndSelect('option.groupClass', 'groupClass')
        .leftJoinAndSelect('cp.bundleComponents', 'bundle')
        .orderBy('step.stepOrder', 'ASC')
        .addOrderBy('option.id', 'ASC');
    }

    return queryBuilder.getOne();
  }

  /**
   * Find or fail (throws NotFoundException)
   */
  async findOneOrFail(id: number, includeRelations = false): Promise<CourseProgram> {
    const courseProgram = await this.findOne(id, includeRelations);

    if (!courseProgram) {
      throw new NotFoundException(`Course program with ID ${id} not found`);
    }

    return courseProgram;
  }

  /**
   * Find course program by code
   */
  async findByCode(code: string, includeRelations = false): Promise<CourseProgram | null> {
    const queryBuilder = this.courseProgramRepo
      .createQueryBuilder('cp')
      .where('cp.code = :code', { code });

    if (includeRelations) {
      queryBuilder
        .leftJoinAndSelect('cp.steps', 'step')
        .leftJoinAndSelect('step.stepOptions', 'option')
        .leftJoinAndSelect('option.groupClass', 'groupClass')
        .leftJoinAndSelect('cp.bundleComponents', 'bundle')
        .orderBy('step.stepOrder', 'ASC')
        .addOrderBy('option.id', 'ASC');
    }

    return queryBuilder.getOne();
  }

  /**
   * List all active course programs
   */
  async findAll(includeInactive = false): Promise<CourseProgram[]> {
    const queryBuilder = this.courseProgramRepo
      .createQueryBuilder('cp')
      .leftJoinAndSelect('cp.steps', 'step')
      .orderBy('cp.createdAt', 'DESC')
      .addOrderBy('step.stepOrder', 'ASC');

    if (!includeInactive) {
      queryBuilder.where('cp.isActive = :isActive', { isActive: true });
    }

    return queryBuilder.getMany();
  }

  /**
   * Soft delete a course program
   */
  async remove(id: number): Promise<void> {
    const courseProgram = await this.findOneOrFail(id);

    // Check if there are active enrollments
    const enrollmentCount = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('student_course_enrollment', 'sce')
      .where('sce.course_program_id = :id', { id })
      .andWhere('sce.status = :status', { status: 'ACTIVE' })
      .getRawOne();

    if (parseInt(enrollmentCount.count) > 0) {
      throw new BadRequestException(
        'Cannot delete course program with active enrollments. Deactivate it instead.',
      );
    }

    await this.courseProgramRepo.softRemove(courseProgram);
  }

  /**
   * Publish course to Stripe (placeholder - implemented in stripe service)
   */
  async publishToStripe(
    id: number,
    priceInCents: number,
    currency = 'usd',
  ): Promise<{ stripeProductId: string; stripePriceId: string }> {
    const courseProgram = await this.findOneOrFail(id, true);

    // Validation: ensure course has at least one step with options
    if (!courseProgram.steps || courseProgram.steps.length === 0) {
      throw new BadRequestException('Course must have at least one step before publishing');
    }

    const stepsWithOptions = courseProgram.steps.filter(
      (step) => step.stepOptions && step.stepOptions.length > 0,
    );

    if (stepsWithOptions.length === 0) {
      throw new BadRequestException(
        'Course must have at least one step with class options before publishing',
      );
    }

    // TODO: Call stripe service to create product/price
    // For now, return placeholder
    throw new Error('Stripe integration not yet implemented - see course-programs-stripe.md');
  }
}
```

---

### 2.2 Course Steps Service

#### `services/course-steps.service.ts`
```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseStep } from '../entities/course-step.entity.js';
import { CourseStepOption } from '../entities/course-step-option.entity.js';
import { GroupClass } from '../../group-classes/entities/group-class.entity.js';
import {
  CreateCourseStepInput,
  UpdateCourseStepInput,
  AttachStepOptionInput,
} from '../dto/admin/index.js';

@Injectable()
export class CourseStepsService {
  constructor(
    @InjectRepository(CourseStep)
    private readonly courseStepRepo: Repository<CourseStep>,
    @InjectRepository(CourseStepOption)
    private readonly stepOptionRepo: Repository<CourseStepOption>,
    @InjectRepository(GroupClass)
    private readonly groupClassRepo: Repository<GroupClass>,
  ) {}

  /**
   * Create a new course step
   */
  async create(input: CreateCourseStepInput): Promise<CourseStep> {
    // Check for duplicate label within course
    const existingLabel = await this.courseStepRepo.findOne({
      where: {
        courseProgramId: input.courseProgramId,
        label: input.label,
      },
    });

    if (existingLabel) {
      throw new ConflictException(
        `Step with label "${input.label}" already exists in this course`,
      );
    }

    // Check for duplicate stepOrder within course
    const existingOrder = await this.courseStepRepo.findOne({
      where: {
        courseProgramId: input.courseProgramId,
        stepOrder: input.stepOrder,
      },
    });

    if (existingOrder) {
      throw new ConflictException(
        `Step with order ${input.stepOrder} already exists in this course`,
      );
    }

    const step = this.courseStepRepo.create(input);
    return this.courseStepRepo.save(step);
  }

  /**
   * Update an existing course step
   */
  async update(id: number, input: UpdateCourseStepInput): Promise<CourseStep> {
    const step = await this.findOneOrFail(id);

    // Check for duplicate label if changing
    if (input.label && input.label !== step.label) {
      const existingLabel = await this.courseStepRepo.findOne({
        where: {
          courseProgramId: step.courseProgramId,
          label: input.label,
        },
      });

      if (existingLabel) {
        throw new ConflictException(
          `Step with label "${input.label}" already exists in this course`,
        );
      }
    }

    // Check for duplicate stepOrder if changing
    if (input.stepOrder && input.stepOrder !== step.stepOrder) {
      const existingOrder = await this.courseStepRepo.findOne({
        where: {
          courseProgramId: step.courseProgramId,
          stepOrder: input.stepOrder,
        },
      });

      if (existingOrder) {
        throw new ConflictException(
          `Step with order ${input.stepOrder} already exists in this course`,
        );
      }
    }

    Object.assign(step, input);
    return this.courseStepRepo.save(step);
  }

  /**
   * Find step by ID
   */
  async findOne(id: number, includeOptions = false): Promise<CourseStep | null> {
    const queryBuilder = this.courseStepRepo
      .createQueryBuilder('step')
      .where('step.id = :id', { id });

    if (includeOptions) {
      queryBuilder
        .leftJoinAndSelect('step.stepOptions', 'option')
        .leftJoinAndSelect('option.groupClass', 'groupClass')
        .orderBy('option.id', 'ASC');
    }

    return queryBuilder.getOne();
  }

  /**
   * Find or fail
   */
  async findOneOrFail(id: number, includeOptions = false): Promise<CourseStep> {
    const step = await this.findOne(id, includeOptions);

    if (!step) {
      throw new NotFoundException(`Course step with ID ${id} not found`);
    }

    return step;
  }

  /**
   * Delete a course step
   */
  async remove(id: number): Promise<void> {
    const step = await this.findOneOrFail(id);

    // Check if students have booked this step
    const progressCount = await this.courseStepRepo.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('student_course_progress', 'scp')
      .where('scp.course_step_id = :id', { id })
      .andWhere('scp.status IN (:...statuses)', {
        statuses: ['BOOKED', 'COMPLETED'],
      })
      .getRawOne();

    if (parseInt(progressCount.count) > 0) {
      throw new BadRequestException(
        'Cannot delete step with active or completed bookings',
      );
    }

    await this.courseStepRepo.softRemove(step);
  }

  /**
   * Attach a group class as an option for this step
   */
  async attachOption(input: AttachStepOptionInput): Promise<CourseStepOption> {
    // Verify step exists
    await this.findOneOrFail(input.courseStepId);

    // Verify group class exists
    const groupClass = await this.groupClassRepo.findOne({
      where: { id: input.groupClassId },
    });

    if (!groupClass) {
      throw new NotFoundException(`Group class with ID ${input.groupClassId} not found`);
    }

    // Check for duplicate attachment
    const existing = await this.stepOptionRepo.findOne({
      where: {
        courseStepId: input.courseStepId,
        groupClassId: input.groupClassId,
      },
      withDeleted: true, // Include soft-deleted to handle re-attachment
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('This group class is already attached to this step');
    }

    // If soft-deleted, restore it
    if (existing && existing.deletedAt) {
      existing.deletedAt = null;
      existing.isActive = input.isActive;
      return this.stepOptionRepo.save(existing);
    }

    // Create new attachment
    const option = this.stepOptionRepo.create(input);
    return this.stepOptionRepo.save(option);
  }

  /**
   * Detach (soft delete) a step option
   */
  async detachOption(courseStepOptionId: number): Promise<void> {
    const option = await this.stepOptionRepo.findOne({
      where: { id: courseStepOptionId },
    });

    if (!option) {
      throw new NotFoundException(`Step option with ID ${courseStepOptionId} not found`);
    }

    // Check if students have booked this specific option
    const progressCount = await this.stepOptionRepo.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('student_course_progress', 'scp')
      .where('scp.selected_option_id = :id', { id: courseStepOptionId })
      .andWhere('scp.status IN (:...statuses)', {
        statuses: ['BOOKED', 'COMPLETED'],
      })
      .getRawOne();

    if (parseInt(progressCount.count) > 0) {
      throw new BadRequestException(
        'Cannot detach option with active or completed bookings',
      );
    }

    await this.stepOptionRepo.softRemove(option);
  }

  /**
   * List all options for a step
   */
  async listOptions(courseStepId: number): Promise<CourseStepOption[]> {
    return this.stepOptionRepo.find({
      where: { courseStepId },
      relations: ['groupClass'],
      order: { id: 'ASC' },
    });
  }
}
```

---

### 2.3 Course Enrollments Service

#### `services/course-enrollments.service.ts`
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StudentCourseEnrollment } from '../entities/student-course-enrollment.entity.js';
import { StudentCourseProgress } from '../entities/student-course-progress.entity.js';
import { CourseProgram } from '../entities/course-program.entity.js';
import { Student } from '../../students/entities/student.entity.js';

@Injectable()
export class CourseEnrollmentsService {
  constructor(
    @InjectRepository(StudentCourseEnrollment)
    private readonly enrollmentRepo: Repository<StudentCourseEnrollment>,
    @InjectRepository(StudentCourseProgress)
    private readonly progressRepo: Repository<StudentCourseProgress>,
    @InjectRepository(CourseProgram)
    private readonly courseProgramRepo: Repository<CourseProgram>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create enrollment and seed progress records (called by Stripe webhook)
   */
  async createEnrollment(
    studentId: number,
    courseProgramId: number,
    stripePaymentIntentId: string,
    stripeProductId: string,
    stripePriceId: string,
  ): Promise<StudentCourseEnrollment> {
    return this.dataSource.transaction(async (manager) => {
      // Verify student exists
      const student = await manager.findOne(Student, { where: { id: studentId } });
      if (!student) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }

      // Verify course program exists and load steps
      const courseProgram = await manager.findOne(CourseProgram, {
        where: { id: courseProgramId },
        relations: ['steps'],
      });

      if (!courseProgram) {
        throw new NotFoundException(`Course program with ID ${courseProgramId} not found`);
      }

      // Check for existing enrollment
      const existing = await manager.findOne(StudentCourseEnrollment, {
        where: { studentId, courseProgramId },
      });

      if (existing && existing.status === 'ACTIVE') {
        throw new ForbiddenException('Student is already enrolled in this course');
      }

      // Create enrollment
      const enrollment = manager.create(StudentCourseEnrollment, {
        studentId,
        courseProgramId,
        stripePaymentIntentId,
        stripeProductId,
        stripePriceId,
        status: 'ACTIVE',
        purchasedAt: new Date(),
      });

      const savedEnrollment = await manager.save(StudentCourseEnrollment, enrollment);

      // Seed progress records for each step
      const progressRecords = courseProgram.steps.map((step) =>
        manager.create(StudentCourseProgress, {
          studentCourseEnrollmentId: savedEnrollment.id,
          courseStepId: step.id,
          status: 'UNBOOKED',
          creditConsumed: false,
        }),
      );

      await manager.save(StudentCourseProgress, progressRecords);

      return savedEnrollment;
    });
  }

  /**
   * Get student's enrollment status for a course
   */
  async getEnrollmentStatus(
    studentId: number,
    courseProgramId: number,
  ): Promise<StudentCourseEnrollment | null> {
    return this.enrollmentRepo.findOne({
      where: { studentId, courseProgramId },
      relations: ['progress', 'progress.courseStep'],
    });
  }

  /**
   * Check if student is enrolled in a course
   */
  async isEnrolled(studentId: number, courseProgramId: number): Promise<boolean> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: {
        studentId,
        courseProgramId,
        status: 'ACTIVE',
      },
    });

    return !!enrollment;
  }

  /**
   * Get all active enrollments for a student
   */
  async getStudentEnrollments(studentId: number): Promise<StudentCourseEnrollment[]> {
    return this.enrollmentRepo.find({
      where: { studentId, status: 'ACTIVE' },
      relations: ['courseProgram', 'progress'],
      order: { purchasedAt: 'DESC' },
    });
  }

  /**
   * Cancel enrollment (called on refund)
   */
  async cancelEnrollment(enrollmentId: number): Promise<void> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    enrollment.status = 'CANCELLED';
    enrollment.cancelledAt = new Date();
    await this.enrollmentRepo.save(enrollment);
  }

  /**
   * Process refund (called by Stripe webhook)
   */
  async processRefund(enrollmentId: number): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const enrollment = await manager.findOne(StudentCourseEnrollment, {
        where: { id: enrollmentId },
        relations: ['progress'],
      });

      if (!enrollment) {
        throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
      }

      // Cancel enrollment
      enrollment.status = 'REFUNDED';
      enrollment.refundedAt = new Date();
      await manager.save(StudentCourseEnrollment, enrollment);

      // TODO: Revoke bundled credits if not consumed
      // This will be implemented in the Stripe integration phase
    });
  }
}
```

---

### 2.4 Course Progress Service

#### `services/course-progress.service.ts`
```typescript
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentCourseProgress } from '../entities/student-course-progress.entity.js';
import { StudentCourseEnrollment } from '../entities/student-course-enrollment.entity.js';

@Injectable()
export class CourseProgressService {
  constructor(
    @InjectRepository(StudentCourseProgress)
    private readonly progressRepo: Repository<StudentCourseProgress>,
    @InjectRepository(StudentCourseEnrollment)
    private readonly enrollmentRepo: Repository<StudentCourseEnrollment>,
  ) {}

  /**
   * Mark a step as booked
   */
  async markBooked(
    enrollmentId: number,
    courseStepId: number,
    sessionId: number,
    selectedOptionId: number,
  ): Promise<StudentCourseProgress> {
    const progress = await this.findProgress(enrollmentId, courseStepId);

    if (progress.status !== 'UNBOOKED' && progress.status !== 'CANCELLED') {
      throw new BadRequestException(`Step is already ${progress.status.toLowerCase()}`);
    }

    progress.status = 'BOOKED';
    progress.bookedAt = new Date();
    progress.sessionId = sessionId;
    progress.selectedOptionId = selectedOptionId;
    progress.creditConsumed = true;

    return this.progressRepo.save(progress);
  }

  /**
   * Mark a step as completed
   */
  async markCompleted(enrollmentId: number, courseStepId: number): Promise<StudentCourseProgress> {
    const progress = await this.findProgress(enrollmentId, courseStepId);

    if (progress.status !== 'BOOKED') {
      throw new BadRequestException('Can only complete booked steps');
    }

    progress.status = 'COMPLETED';
    progress.completedAt = new Date();

    return this.progressRepo.save(progress);
  }

  /**
   * Mark a step as missed
   */
  async markMissed(enrollmentId: number, courseStepId: number): Promise<StudentCourseProgress> {
    const progress = await this.findProgress(enrollmentId, courseStepId);

    if (progress.status !== 'BOOKED') {
      throw new BadRequestException('Can only mark booked steps as missed');
    }

    progress.status = 'MISSED';

    return this.progressRepo.save(progress);
  }

  /**
   * Cancel a booking (refund entitlement)
   */
  async cancelBooking(enrollmentId: number, courseStepId: number): Promise<StudentCourseProgress> {
    const progress = await this.findProgress(enrollmentId, courseStepId);

    if (progress.status !== 'BOOKED') {
      throw new BadRequestException('Can only cancel booked steps');
    }

    progress.status = 'CANCELLED';
    progress.cancelledAt = new Date();
    progress.creditConsumed = false; // Refund the entitlement

    return this.progressRepo.save(progress);
  }

  /**
   * Get progress for all steps in an enrollment
   */
  async getProgress(enrollmentId: number): Promise<StudentCourseProgress[]> {
    return this.progressRepo.find({
      where: { studentCourseEnrollmentId: enrollmentId },
      relations: ['courseStep'],
      order: { courseStep: { stepOrder: 'ASC' } },
    });
  }

  /**
   * Private helper: find progress or fail
   */
  private async findProgress(
    enrollmentId: number,
    courseStepId: number,
  ): Promise<StudentCourseProgress> {
    const progress = await this.progressRepo.findOne({
      where: {
        studentCourseEnrollmentId: enrollmentId,
        courseStepId,
      },
    });

    if (!progress) {
      throw new NotFoundException('Progress record not found');
    }

    return progress;
  }

  /**
   * Validate booking eligibility (called by booking service)
   */
  async validateBookingEligibility(
    studentId: number,
    courseStepId: number,
    courseStepOptionId: number,
  ): Promise<{ enrollmentId: number; progress: StudentCourseProgress }> {
    // Find active enrollment for the course program containing this step
    const enrollment = await this.enrollmentRepo
      .createQueryBuilder('sce')
      .innerJoin('sce.courseProgram', 'cp')
      .innerJoin('cp.steps', 'step')
      .where('sce.studentId = :studentId', { studentId })
      .andWhere('step.id = :courseStepId', { courseStepId })
      .andWhere('sce.status = :status', { status: 'ACTIVE' })
      .getOne();

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to book this session',
      );
    }

    // Find progress record for this step
    const progress = await this.progressRepo.findOne({
      where: {
        studentCourseEnrollmentId: enrollment.id,
        courseStepId,
      },
    });

    if (!progress) {
      throw new NotFoundException('Progress record not found');
    }

    // Check if step is already booked or completed
    if (progress.status === 'BOOKED' || progress.status === 'COMPLETED') {
      throw new BadRequestException('You have already booked or completed this step');
    }

    return { enrollmentId: enrollment.id, progress };
  }
}
```

---

## Phase 3: Controllers

### 3.1 Admin Controller

#### `controllers/admin-course-programs.controller.ts`
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { CourseProgramsService } from '../services/course-programs.service.js';
import { CourseStepsService } from '../services/course-steps.service.js';
import {
  CreateCourseProgramDto,
  UpdateCourseProgramDto,
  CreateCourseStepDto,
  UpdateCourseStepDto,
  AttachStepOptionDto,
  DetachStepOptionDto,
  CreateBundleComponentDto,
  PublishCourseDto,
} from '../dto/admin/index.js';

/**
 * Admin endpoints for managing course programs
 * Base path: /admin/course-programs
 */
@Controller('admin/course-programs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCourseProgramsController {
  constructor(
    private readonly courseProgramsService: CourseProgramsService,
    private readonly courseStepsService: CourseStepsService,
  ) {}

  // ==================== COURSE PROGRAM CRUD ====================

  @Post()
  async create(@Body() dto: CreateCourseProgramDto) {
    return this.courseProgramsService.create(dto);
  }

  @Get()
  async findAll() {
    return this.courseProgramsService.findAll(true); // Include inactive
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courseProgramsService.findOneOrFail(id, true); // Include relations
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseProgramDto,
  ) {
    return this.courseProgramsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.courseProgramsService.remove(id);
    return { message: 'Course program deleted successfully' };
  }

  // ==================== COURSE STEPS ====================

  @Post(':id/steps')
  async createStep(
    @Param('id', ParseIntPipe) courseProgramId: number,
    @Body() dto: CreateCourseStepDto,
  ) {
    // Ensure courseProgramId matches URL param
    return this.courseStepsService.create({ ...dto, courseProgramId });
  }

  @Put('steps/:stepId')
  async updateStep(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() dto: UpdateCourseStepDto,
  ) {
    return this.courseStepsService.update(stepId, dto);
  }

  @Delete('steps/:stepId')
  async removeStep(@Param('stepId', ParseIntPipe) stepId: number) {
    await this.courseStepsService.remove(stepId);
    return { message: 'Course step deleted successfully' };
  }

  // ==================== STEP OPTIONS ====================

  @Post('steps/:stepId/options')
  async attachOption(
    @Param('stepId', ParseIntPipe) courseStepId: number,
    @Body() dto: AttachStepOptionDto,
  ) {
    // Ensure courseStepId matches URL param
    return this.courseStepsService.attachOption({ ...dto, courseStepId });
  }

  @Delete('steps/options/:optionId')
  async detachOption(@Param('optionId', ParseIntPipe) optionId: number) {
    await this.courseStepsService.detachOption(optionId);
    return { message: 'Step option detached successfully' };
  }

  @Get('steps/:stepId/options')
  async listOptions(@Param('stepId', ParseIntPipe) stepId: number) {
    return this.courseStepsService.listOptions(stepId);
  }

  // ==================== PUBLISHING ====================

  @Post(':id/publish')
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PublishCourseDto,
  ) {
    const { priceInCents, currency } = dto;
    return this.courseProgramsService.publishToStripe(id, priceInCents, currency);
  }
}
```

---

### 3.2 Public Controller

#### `controllers/course-programs.controller.ts`
```typescript
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { StudentGuard } from '../../auth/guards/student.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { User } from '../../users/entities/user.entity.js';
import { CourseProgramsService } from '../services/course-programs.service.js';
import { CourseEnrollmentsService } from '../services/course-enrollments.service.js';
import { StudentsService } from '../../students/students.service.js';

/**
 * Public endpoints for course programs
 * Base path: /course-programs
 */
@Controller('course-programs')
export class CourseProgramsController {
  constructor(
    private readonly courseProgramsService: CourseProgramsService,
    private readonly enrollmentsService: CourseEnrollmentsService,
    private readonly studentsService: StudentsService,
  ) {}

  /**
   * List all active course programs
   */
  @Get()
  async findAll() {
    return this.courseProgramsService.findAll(false); // Only active
  }

  /**
   * Get course program detail
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courseProgramsService.findOneOrFail(id, true); // Include relations
  }

  /**
   * Get student's enrollment status for a course
   */
  @Get(':id/enrollment-status')
  @UseGuards(JwtAuthGuard, StudentGuard)
  async getEnrollmentStatus(
    @Param('id', ParseIntPipe) courseProgramId: number,
    @CurrentUser() user: User,
  ) {
    const student = await this.studentsService.findOneByUserId(user.id);
    return this.enrollmentsService.getEnrollmentStatus(student.id, courseProgramId);
  }

  /**
   * Get student's active enrollments
   */
  @Get('me/enrollments')
  @UseGuards(JwtAuthGuard, StudentGuard)
  async getMyEnrollments(@CurrentUser() user: User) {
    const student = await this.studentsService.findOneByUserId(user.id);
    return this.enrollmentsService.getStudentEnrollments(student.id);
  }
}
```

---

## Phase 4: Guards

### Course Enrollment Guard

#### `guards/course-enrollment.guard.ts`
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CourseProgressService } from '../services/course-progress.service.js';

/**
 * Guard to validate course enrollment before booking
 * Used by booking controller when courseStepId is present in request
 */
@Injectable()
export class CourseEnrollmentGuard implements CanActivate {
  constructor(private readonly progressService: CourseProgressService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { courseStepId, courseStepOptionId } = request.body;
    const studentId = request.user?.studentId;

    if (!studentId) {
      throw new ForbiddenException('Student authentication required');
    }

    if (!courseStepId || !courseStepOptionId) {
      // Not a course booking, skip this guard
      return true;
    }

    // Validate enrollment and booking eligibility
    const { enrollmentId, progress } = await this.progressService.validateBookingEligibility(
      studentId,
      courseStepId,
      courseStepOptionId,
    );

    // Attach to request for use in controller
    request.courseEnrollmentId = enrollmentId;
    request.courseProgress = progress;

    return true;
  }
}
```

---

## Phase 5: Module

### Course Programs Module

#### `course-programs.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CourseProgram,
  CourseStep,
  CourseStepOption,
  CourseBundleComponent,
  StudentCourseEnrollment,
  StudentCourseProgress,
} from './entities/index.js';
import { GroupClass } from '../group-classes/entities/group-class.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { CourseProgramsService } from './services/course-programs.service.js';
import { CourseStepsService } from './services/course-steps.service.js';
import { CourseEnrollmentsService } from './services/course-enrollments.service.js';
import { CourseProgressService } from './services/course-progress.service.js';
import { AdminCourseProgramsController } from './controllers/admin-course-programs.controller.js';
import { CourseProgramsController } from './controllers/course-programs.controller.js';
import { CourseEnrollmentGuard } from './guards/course-enrollment.guard.js';
import { StudentsModule } from '../students/students.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseProgram,
      CourseStep,
      CourseStepOption,
      CourseBundleComponent,
      StudentCourseEnrollment,
      StudentCourseProgress,
      GroupClass,
      Student,
    ]),
    StudentsModule,
  ],
  controllers: [AdminCourseProgramsController, CourseProgramsController],
  providers: [
    CourseProgramsService,
    CourseStepsService,
    CourseEnrollmentsService,
    CourseProgressService,
    CourseEnrollmentGuard,
  ],
  exports: [
    CourseProgramsService,
    CourseEnrollmentsService,
    CourseProgressService,
    CourseEnrollmentGuard,
  ],
})
export class CourseProgramsModule {}
```

---

## Implementation Checklist

### Phase 1: DTOs
- [ ] Create admin DTOs (create, update, attach, publish)
- [ ] Create public DTOs (list, detail, enrollment status)
- [ ] Add Zod schemas for validation
- [ ] Write unit tests for DTO validation

### Phase 2: Services
- [ ] Implement CourseProgramsService (CRUD, publish)
- [ ] Implement CourseStepsService (CRUD, attach/detach options)
- [ ] Implement CourseEnrollmentsService (create, status, refund)
- [ ] Implement CourseProgressService (booking, completion, cancellation)
- [ ] Write service unit tests

### Phase 3: Controllers
- [ ] Implement AdminCourseProgramsController
- [ ] Implement CourseProgramsController (public endpoints)
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Write controller integration tests

### Phase 4: Guards
- [ ] Implement CourseEnrollmentGuard
- [ ] Integrate guard with booking controller
- [ ] Write guard unit tests

### Phase 5: Module & Integration
- [ ] Create CourseProgramsModule
- [ ] Register module in AppModule
- [ ] Run database migration
- [ ] Test end-to-end flow

---

## Testing Strategy

### Unit Tests
- DTO validation with valid/invalid inputs
- Service methods with mocked repositories
- Guard logic with various request scenarios

### Integration Tests
- Controller endpoints with test database
- Full create → attach → publish flow
- Enrollment → booking → completion flow

### E2E Tests
- Admin creates course via API
- Student views course catalog
- Student enrolls (via Stripe webhook simulation)
- Student books step option
- Student views progress

---

## API Endpoint Summary

### Admin Endpoints (`/admin/course-programs`)
- `POST /` - Create course program
- `GET /` - List all course programs
- `GET /:id` - Get course program detail
- `PUT /:id` - Update course program
- `DELETE /:id` - Delete course program
- `POST /:id/steps` - Create course step
- `PUT /steps/:stepId` - Update course step
- `DELETE /steps/:stepId` - Delete course step
- `POST /steps/:stepId/options` - Attach group class to step
- `DELETE /steps/options/:optionId` - Detach group class from step
- `GET /steps/:stepId/options` - List step options
- `POST /:id/publish` - Publish course to Stripe

### Public Endpoints (`/course-programs`)
- `GET /` - List active course programs
- `GET /:id` - Get course program detail
- `GET /:id/enrollment-status` - Get student's enrollment status
- `GET /me/enrollments` - Get student's active enrollments

---

## Next Steps

After backend implementation is complete:
1. Implement Stripe integration (see `course-programs-stripe.md`)
2. Integrate with booking service
3. Build WordPress/frontend components
4. Create admin UI interface
