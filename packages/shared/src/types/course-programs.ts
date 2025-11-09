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
  heroImageUrl: z.string().nullable().describe("URL to course hero image"),
  timezone: z.string(),
  // could be 1, should be transformed to boolean
  isActive: z.preprocess((val) => Boolean(val), z.boolean()),
  stepCount: z.number().describe("Number of steps in this course"),
  priceInCents: z.number().nullable().describe("Price in cents if published"),
  stripePriceId: z.string().nullable(),
  levels: z
    .array(
      z.object({
        id: z.number(),
        code: z.string(),
        name: z.string(),
      }),
    )
    .describe("Student levels appropriate for this course"),
  availableCohorts: z
    .number()
    .describe("Count of cohorts with available spots"),
  nextCohortStartDate: z
    .string()
    .nullable()
    .describe("ISO date of soonest available cohort"),
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
 * Note: Each group class has exactly one session with specific date/time
 */
export const StepOptionDetailSchema = z.object({
  id: z.number(),
  groupClassId: z.number(),
  groupClassName: z.string(),
  isActive: z.preprocess((val) => Boolean(val), z.boolean()),
  maxStudents: z.number().optional(),
  currentEnrollment: z.number().optional(),
  availableSeats: z.number().optional(),
  // Session info - stored in UTC, client formats in user's local timezone
  session: z
    .object({
      id: z.number(),
      startAt: z.string().describe("ISO 8601 datetime of session start (UTC)"),
      endAt: z.string().describe("ISO 8601 datetime of session end (UTC)"),
    })
    .optional(),
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
  heroImageUrl: z.string().nullable().describe("URL to course hero image"),
  slug: z.string().nullable().describe("URL-friendly slug"),
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

// ==================== COHORT DTOs ====================

/**
 * Schema for creating a new course cohort
 */
export const CreateCourseCohortSchema = z.object({
  courseProgramId: z
    .number()
    .int()
    .positive()
    .describe("FK to course_program.id"),

  name: z
    .string()
    .min(3, "Cohort name must be at least 3 characters")
    .max(255, "Cohort name must not exceed 255 characters")
    .describe("Cohort display name (e.g., 'Fall 2025 Cohort')"),

  description: z
    .string()
    .max(5000, "Description must not exceed 5000 characters")
    .optional()
    .nullable()
    .describe("Optional cohort-specific description"),

  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format")
    .describe("First session date of cohort"),

  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
    .describe("Last session date of cohort"),

  maxEnrollment: z
    .number()
    .int()
    .positive()
    .min(1, "Maximum enrollment must be at least 1")
    .describe("Maximum students allowed in cohort"),

  enrollmentDeadline: z
    .string()
    .optional()
    .nullable()
    .describe("Last datetime student can enroll (ISO 8601 format, stored in UTC)"),

  isActive: z
    .boolean()
    .default(true)
    .describe("Whether cohort is available for enrollment"),
});

export type CreateCourseCohortDto = z.infer<typeof CreateCourseCohortSchema>;

/**
 * Schema for updating an existing cohort
 */
export const UpdateCourseCohortSchema = CreateCourseCohortSchema.omit({
  courseProgramId: true,
}).partial();

export type UpdateCourseCohortDto = z.infer<typeof UpdateCourseCohortSchema>;

/**
 * Schema for assigning a session to a cohort step
 */
export const AssignCohortSessionSchema = z.object({
  cohortId: z.number().int().positive().describe("FK to course_cohort.id"),

  courseStepId: z.number().int().positive().describe("FK to course_step.id"),

  courseStepOptionId: z
    .number()
    .int()
    .positive()
    .describe("FK to course_step_option.id"),
});

export type AssignCohortSessionDto = z.infer<typeof AssignCohortSessionSchema>;

/**
 * Cohort session detail (which session is assigned to which step)
 */
export const CohortSessionDetailSchema = z.object({
  id: z.number(),
  cohortId: z.number(),
  courseStepId: z.number(),
  courseStepOptionId: z.number(),
  // Include step and option details for convenience
  stepLabel: z.string(),
  stepTitle: z.string(),
  stepOrder: z.number(),
  groupClassName: z.string(),
  sessionDateTime: z.string().describe("ISO datetime of session"),
  durationMinutes: z.number().describe("Session duration in minutes"),
});

export type CohortSessionDetailDto = z.infer<typeof CohortSessionDetailSchema>;

/**
 * Cohort list item (for admin cohort management)
 */
export const CourseCohortListItemSchema = z.object({
  id: z.number(),
  courseProgramId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  maxEnrollment: z.number(),
  currentEnrollment: z.number(),
  enrollmentDeadline: z.string().nullable(),
  isActive: z.preprocess((val) => Boolean(val), z.boolean()),
  availableSpots: z.number().describe("maxEnrollment - currentEnrollment"),
  sessionCount: z.number().describe("Number of sessions assigned to cohort"),
});

export type CourseCohortListItemDto = z.infer<
  typeof CourseCohortListItemSchema
>;

/**
 * Full cohort detail with assigned sessions
 */
export const CourseCohortDetailSchema = z.object({
  id: z.number(),
  courseProgramId: z.number(),
  courseCode: z.string(),
  courseTitle: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  maxEnrollment: z.number(),
  currentEnrollment: z.number(),
  enrollmentDeadline: z.string().nullable(),
  isActive: z.preprocess((val) => Boolean(val), z.boolean()),
  availableSpots: z.number(),
  sessions: z.array(CohortSessionDetailSchema),
});

export type CourseCohortDetailDto = z.infer<typeof CourseCohortDetailSchema>;

/**
 * Public cohort info (for students browsing courses)
 */
export const PublicCourseCohortSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  availableSpots: z.number(),
  enrollmentDeadline: z.string().nullable(),
  isAvailable: z
    .boolean()
    .describe(
      "True if spots available and deadline not passed and cohort is active",
    ),
  sessions: z.array(CohortSessionDetailSchema),
});

export type PublicCourseCohortDto = z.infer<typeof PublicCourseCohortSchema>;

// ==================== ENROLLMENT DTOs ====================

/**
 * Request body for enrolling in a cohort
 */
export const EnrollInCohortSchema = z.object({
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type EnrollInCohortDto = z.infer<typeof EnrollInCohortSchema>;

/**
 * Response from enrollment endpoint (Stripe checkout session)
 */
export const EnrollmentCheckoutResponseSchema = z.object({
  sessionId: z.string().describe("Stripe Checkout Session ID"),
  url: z.string().url().describe("Stripe Checkout URL to redirect to"),
});

export type EnrollmentCheckoutResponseDto = z.infer<
  typeof EnrollmentCheckoutResponseSchema
>;

/**
 * Response schema for student's course enrollments list
 */
export const StudentCourseEnrollmentsResponseSchema = z.array(
  StudentCoursePackageSchema,
);

export type StudentCourseEnrollmentsResponse = z.infer<
  typeof StudentCourseEnrollmentsResponseSchema
>;
