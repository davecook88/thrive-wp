import { z } from "zod";

// ==================== RESPONSE DTOs ====================

/**
 * Schema for testimonial response
 * Used for both public and admin endpoints
 */
export const TestimonialResponseSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  studentName: z.string().describe("Full name of the student who wrote the testimonial"),
  studentAvatarUrl: z.string().nullable().optional().describe("Avatar URL of the student"),
  teacherId: z.number().nullable(),
  teacherName: z.string().nullable().describe("Full name of the teacher if teacher-specific testimonial"),
  courseProgramId: z.number().nullable(),
  courseProgramTitle: z.string().nullable().describe("Title of the course if course-specific testimonial"),
  rating: z.number().min(1).max(5).describe("Star rating from 1 to 5"),
  comment: z.string().nullable().describe("Written review/feedback (optional)"),
  tags: z.array(z.string()).nullable().describe("Array of tags for categorization"),
  status: z.enum(["pending", "approved", "rejected"]).describe("Moderation status"),
  isFeatured: z.boolean().describe("Whether this testimonial is highlighted/featured"),
  createdAt: z.string().describe("ISO 8601 timestamp when testimonial was created (UTC)"),
  adminFeedback: z.string().nullable().optional().describe("Admin feedback on approval/rejection"),
  reviewedAt: z.string().nullable().optional().describe("ISO 8601 timestamp when admin reviewed (UTC)"),
  reviewedByAdminId: z.number().nullable().optional().describe("ID of admin who reviewed"),
});

export type TestimonialResponseDto = z.infer<typeof TestimonialResponseSchema>;

/**
 * Schema for paginated testimonials response (admin)
 */
export const PaginatedTestimonialsResponseSchema = z.object({
  testimonials: z.array(TestimonialResponseSchema),
  total: z.number().describe("Total number of testimonials matching filters"),
  page: z.number().describe("Current page number"),
  limit: z.number().describe("Number of items per page"),
  totalPages: z.number().describe("Total number of pages"),
});

export type PaginatedTestimonialsResponse = z.infer<typeof PaginatedTestimonialsResponseSchema>;

// ==================== CREATE/UPDATE DTOs ====================

/**
 * Schema for creating a new testimonial (student endpoint)
 * Student ID is extracted from auth context, not passed in the request
 */
export const CreateTestimonialSchema = z.object({
  teacherId: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable()
    .describe("FK to teacher.id if this is a teacher-specific testimonial"),

  courseProgramId: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable()
    .describe("FK to course_program.id if this is a course-specific testimonial"),

  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars")
    .describe("Star rating from 1 to 5 (required)"),

  comment: z
    .string()
    .max(2000, "Comment must not exceed 2000 characters")
    .optional()
    .nullable()
    .describe("Written review/feedback (optional)"),

  tags: z
    .array(z.string().max(50, "Tag must not exceed 50 characters"))
    .max(10, "Cannot have more than 10 tags")
    .optional()
    .nullable()
    .describe("Array of tags for categorization"),
}).refine(
  (data) => {
    // Cannot have both teacherId and courseProgramId
    if (data.teacherId && data.courseProgramId) {
      return false;
    }
    return true;
  },
  {
    message: "Testimonial can be for either a teacher OR a course, not both",
  },
);

export type CreateTestimonialDto = z.infer<typeof CreateTestimonialSchema>;

/**
 * Schema for admin creating a testimonial (e.g., porting legacy reviews)
 * Admin specifies the student ID and can set initial status
 */
export const AdminCreateTestimonialSchema = z.object({
  studentId: z
    .number()
    .int()
    .positive()
    .describe("FK to student.id - which student this testimonial is from"),

  teacherId: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable()
    .describe("FK to teacher.id if this is a teacher-specific testimonial"),

  courseProgramId: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable()
    .describe("FK to course_program.id if this is a course-specific testimonial"),

  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars")
    .describe("Star rating from 1 to 5 (required)"),

  comment: z
    .string()
    .max(2000, "Comment must not exceed 2000 characters")
    .optional()
    .nullable()
    .describe("Written review/feedback (optional)"),

  tags: z
    .array(z.string().max(50, "Tag must not exceed 50 characters"))
    .max(10, "Cannot have more than 10 tags")
    .optional()
    .nullable()
    .describe("Array of tags for categorization"),

  status: z
    .enum(["pending", "approved", "rejected"])
    .optional()
    .default("approved")
    .describe("Initial status (defaults to approved for admin-created testimonials)"),

  isFeatured: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to mark as featured"),

  adminFeedback: z
    .string()
    .max(1000, "Admin feedback must not exceed 1000 characters")
    .optional()
    .nullable()
    .describe("Optional admin notes about this testimonial"),
}).refine(
  (data) => {
    // Cannot have both teacherId and courseProgramId
    if (data.teacherId && data.courseProgramId) {
      return false;
    }
    return true;
  },
  {
    message: "Testimonial can be for either a teacher OR a course, not both",
  },
);

export type AdminCreateTestimonialDto = z.infer<typeof AdminCreateTestimonialSchema>;

/**
 * Schema for updating a testimonial (admin only)
 * All fields are optional for partial updates
 */
export const UpdateTestimonialSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe("Updated star rating"),

  comment: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .describe("Updated comment text"),

  tags: z
    .array(z.string().max(50))
    .max(10)
    .optional()
    .nullable()
    .describe("Updated tags array"),

  isFeatured: z
    .boolean()
    .optional()
    .describe("Whether to feature this testimonial"),
});

export type UpdateTestimonialDto = z.infer<typeof UpdateTestimonialSchema>;

// ==================== MODERATION DTOs ====================

/**
 * Schema for approving a testimonial
 * Admin feedback is optional on approval
 */
export const ApproveTestimonialSchema = z.object({
  adminFeedback: z
    .string()
    .max(1000, "Admin feedback must not exceed 1000 characters")
    .optional()
    .nullable()
    .describe("Optional feedback from admin when approving"),
});

export type ApproveTestimonialDto = z.infer<typeof ApproveTestimonialSchema>;

/**
 * Schema for rejecting a testimonial
 * Admin feedback is required when rejecting
 */
export const RejectTestimonialSchema = z.object({
  adminFeedback: z
    .string()
    .min(1, "Feedback is required when rejecting a testimonial")
    .max(1000, "Admin feedback must not exceed 1000 characters")
    .describe("Reason for rejection (required)"),
});

export type RejectTestimonialDto = z.infer<typeof RejectTestimonialSchema>;

// ==================== ELIGIBILITY DTOs ====================

/**
 * Schema for checking student's eligibility to submit testimonials
 * Returns what the student is allowed to review
 */
export const TestimonialEligibilitySchema = z.object({
  canSubmitGeneral: z.boolean().describe("Can submit general platform testimonial"),
  eligibleTeachers: z.array(
    z.object({
      teacherId: z.number(),
      teacherName: z.string(),
      canSubmit: z.boolean().describe("Whether student can review this teacher"),
      hasExistingTestimonial: z.boolean().describe("Whether student already reviewed this teacher"),
    }),
  ).describe("Teachers the student has studied with"),
  eligibleCourses: z.array(
    z.object({
      courseProgramId: z.number(),
      courseProgramTitle: z.string(),
      canSubmit: z.boolean().describe("Whether student can review this course"),
      hasExistingTestimonial: z.boolean().describe("Whether student already reviewed this course"),
    }),
  ).describe("Courses the student is enrolled in"),
});

export type TestimonialEligibilityDto = z.infer<typeof TestimonialEligibilitySchema>;
