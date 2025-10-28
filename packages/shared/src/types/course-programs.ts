import { z } from "zod";

// ==================== ADMIN DTOs ====================

/**
 * Schema for creating a new course program
 */
export const CreateCourseProgramSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code must not exceed 50 characters")
    .regex(
      /^[A-Z0-9-]+$/,
      "Code must contain only uppercase letters, numbers, and hyphens",
    )
    .describe("Human-readable course code (e.g., 'SFZ', 'ADV-TECH')"),

  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(255, "Title must not exceed 255 characters")
    .describe("Course title"),

  description: z
    .string()
    .max(5000, "Description must not exceed 5000 characters")
    .optional()
    .nullable()
    .describe("Marketing description"),

  timezone: z
    .string()
    .default("America/New_York")
    .describe("Default timezone for scheduling recommendations"),

  isActive: z
    .boolean()
    .default(true)
    .describe("Whether the course is available for purchase"),

  levelIds: z
    .array(z.number().int().positive())
    .optional()
    .default([])
    .describe("Array of level IDs appropriate for this course"),
});

export type CreateCourseProgramDto = z.infer<typeof CreateCourseProgramSchema>;

/**
 * Schema for updating an existing course program
 * All fields are optional for partial updates
 */
export const UpdateCourseProgramSchema = CreateCourseProgramSchema.partial();

export type UpdateCourseProgramDto = z.infer<typeof UpdateCourseProgramSchema>;

/**
 * Schema for creating a course step
 */
export const CreateCourseStepSchema = z.object({
  courseProgramId: z
    .number()
    .int()
    .positive()
    .describe("FK to course_program.id"),

  stepOrder: z
    .number()
    .int()
    .positive()
    .min(1, "Step order must be at least 1")
    .describe("Ordering within course (1, 2, 3...)"),

  label: z
    .string()
    .min(1, "Label is required")
    .max(100, "Label must not exceed 100 characters")
    .describe("Step label (e.g., 'SFZ-1', 'Foundation')"),

  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(255, "Title must not exceed 255 characters")
    .describe("Step title"),

  description: z
    .string()
    .max(5000, "Description must not exceed 5000 characters")
    .optional()
    .nullable()
    .describe("Step content/overview"),

  isRequired: z
    .preprocess((val) => Boolean(val), z.boolean())
    .default(true)
    .describe("Whether step must be completed"),
});

export type CreateCourseStepDto = z.infer<typeof CreateCourseStepSchema>;

/**
 * Schema for updating a course step
 * courseProgramId is excluded as steps can't be moved between programs
 */
export const UpdateCourseStepSchema = CreateCourseStepSchema.omit({
  courseProgramId: true,
}).partial();

export type UpdateCourseStepDto = z.infer<typeof UpdateCourseStepSchema>;

/**
 * Schema for attaching a group class to a course step
 */
export const AttachStepOptionSchema = z.object({
  courseStepId: z.number().int().positive().describe("FK to course_step.id"),

  groupClassId: z.number().int().positive().describe("FK to group_class.id"),

  isActive: z
    .boolean()
    .default(true)
    .describe("Whether this option is available for booking"),
});

export type AttachStepOptionDto = z.infer<typeof AttachStepOptionSchema>;

/**
 * Schema for detaching (soft deleting) a step option
 */
export const DetachStepOptionSchema = z.object({
  courseStepOptionId: z
    .number()
    .int()
    .positive()
    .describe("ID of course_step_option to remove"),
});

export type DetachStepOptionDto = z.infer<typeof DetachStepOptionSchema>;

/**
 * Component types for bundled extras
 */
export const ComponentTypeEnum = z.enum(["PRIVATE_CREDIT", "GROUP_CREDIT"]);

/**
 * Schema for publishing a course to Stripe
 */
export const PublishCourseSchema = z.object({
  courseProgramId: z
    .number()
    .int()
    .positive()
    .describe("Course program to publish"),

  priceInCents: z
    .number()
    .int()
    .positive()
    .describe("Price in cents (e.g., 49900 for $499.00)"),

  currency: z.string().length(3).default("usd").describe("ISO currency code"),

  stripePriceMetadata: z
    .record(z.string(), z.string())
    .optional()
    .describe("Additional Stripe price metadata"),
});

export type PublishCourseDto = z.infer<typeof PublishCourseSchema>;

// ==================== PUBLIC DTOs ====================

/**
 * Response schema for course program list view
 */
export const CourseProgramListItemSchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  timezone: z.string(),
  // could be 1, should be transformed to boolean
  isActive: z.preprocess((val) => Boolean(val), z.boolean()),
  stepCount: z.number().describe("Number of steps in this course"),
  priceInCents: z.number().nullable().describe("Price in cents if published"),
  stripePriceId: z.string().nullable(),
});

export type CourseProgramListItemDto = z.infer<
  typeof CourseProgramListItemSchema
>;

/**
 * Paginated list response
 */
export const CourseProgramListResponseSchema = z.object({
  items: z.array(CourseProgramListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type CourseProgramListResponseDto = z.infer<
  typeof CourseProgramListResponseSchema
>;

/**
 * Step option detail (group class schedule info)
 */
export const StepOptionDetailSchema = z.object({
  id: z.number(),
  groupClassId: z.number(),
  groupClassName: z.string(),
  isActive: z.preprocess((val) => Boolean(val), z.boolean()),
  // Include relevant GroupClass fields
  dayOfWeek: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
  maxStudents: z.number().optional(),
  currentEnrollment: z.number().optional(),
  availableSeats: z.number().optional(),
});

export type StepOptionDetailDto = z.infer<typeof StepOptionDetailSchema>;

/**
 * Step detail with options
 */
export const CourseStepDetailSchema = z.object({
  id: z.number(),
  stepOrder: z.number(),
  label: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  isRequired: z.preprocess((val) => Boolean(val), z.boolean()),
  options: z.array(StepOptionDetailSchema),
});

export type CourseStepDetailDto = z.infer<typeof CourseStepDetailSchema>;

/**
 * Bundle component detail
 */
export const BundleComponentDetailSchema = z.object({
  id: z.number(),
  componentType: z.enum(["PRIVATE_CREDIT", "GROUP_CREDIT"]),
  quantity: z.number(),
  description: z.string().nullable(),
});

export type BundleComponentDetailDto = z.infer<
  typeof BundleComponentDetailSchema
>;

/**
 * Full course program detail
 */
export const CourseProgramDetailSchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  timezone: z.string(),
  isActive: z.preprocess((val) => Boolean(val), z.boolean()),
  stripeProductId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
  priceInCents: z.number().nullable(),
  steps: z.array(CourseStepDetailSchema),
  levels: z
    .array(
      z.object({
        id: z.number(),
        code: z.string(),
        name: z.string(),
      }),
    )
    .optional()
    .default([]),
});

export type CourseProgramDetailDto = z.infer<typeof CourseProgramDetailSchema>;

/**
 * Student's progress for a single course step
 * Simplified architecture: Links to StudentPackage instead of StudentCourseEnrollment
 */
export const StudentCourseStepProgressSchema = z.object({
  id: z.number().int().positive(),
  studentPackageId: z.number().int().positive(),
  courseStepId: z.number().int().positive(),
  status: z.enum(["UNBOOKED", "BOOKED", "COMPLETED", "MISSED", "CANCELLED"]),
  sessionId: z.number().int().positive().nullable(),
  bookedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export type StudentCourseStepProgress = z.infer<
  typeof StudentCourseStepProgressSchema
>;

/**
 * Progress view with step details (for student dashboard)
 */
export const CourseStepProgressViewSchema = z.object({
  stepId: z.number(),
  stepLabel: z.string(),
  stepTitle: z.string(),
  stepOrder: z.number(),
  status: z.enum(["UNBOOKED", "BOOKED", "COMPLETED", "MISSED", "CANCELLED"]),
  bookedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  sessionId: z.number().nullable(),
});

export type CourseStepProgressView = z.infer<
  typeof CourseStepProgressViewSchema
>;

/**
 * Student's course package with progress
 */
export const StudentCoursePackageSchema = z.object({
  packageId: z.number(),
  packageName: z.string(),
  courseProgramId: z.number(),
  courseCode: z.string(),
  courseTitle: z.string(),
  purchasedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  progress: z.array(CourseStepProgressViewSchema),
  completedSteps: z.number(),
  totalSteps: z.number(),
});

export type StudentCoursePackage = z.infer<typeof StudentCoursePackageSchema>;
