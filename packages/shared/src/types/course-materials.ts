import { z } from "zod";

// Material Types
export const MaterialTypeSchema = z.enum([
  "file",
  "video_embed",
  "rich_text",
  "question",
]);
export type MaterialType = z.infer<typeof MaterialTypeSchema>;

export const QuestionTypeSchema = z.enum([
  "multiple_choice",
  "long_text",
  "file_upload",
  "video_upload",
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const ProgressStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);
export type ProgressStatus = z.infer<typeof ProgressStatusSchema>;

export const AnswerStatusSchema = z.enum([
  "pending_assessment",
  "approved",
  "needs_revision",
]);
export type AnswerStatus = z.infer<typeof AnswerStatusSchema>;

export const QuestionOptionSchema = z.union([
  z.string(),
  z.object({
    text: z.string(),
    correct: z.boolean().optional(),
  }),
]);
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

// DTOs
export const MaterialQuestionDtoSchema = z.object({
  id: z.number(),
  materialId: z.number(),
  questionText: z.string(),
  questionType: QuestionTypeSchema,
  options: z.record(z.string(), QuestionOptionSchema).optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MaterialQuestionDto = z.infer<typeof MaterialQuestionDtoSchema>;

export const CourseStepMaterialDtoSchema = z.object({
  id: z.number(),
  courseStepId: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  type: MaterialTypeSchema,
  content: z.string().nullable().optional(),
  order: z.number(),
  createdById: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  questions: z.array(MaterialQuestionDtoSchema).optional(),
});
export type CourseStepMaterialDto = z.infer<typeof CourseStepMaterialDtoSchema>;

export const StudentCourseStepMaterialProgressDtoSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  courseStepMaterialId: z.number(),
  studentPackageId: z.number(),
  status: ProgressStatusSchema,
  completedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StudentCourseStepMaterialProgressDto = z.infer<
  typeof StudentCourseStepMaterialProgressDtoSchema
>;

export const StudentAnswerDtoSchema = z.object({
  id: z.number(),
  questionId: z.number(),
  studentId: z.number(),
  answerContent: z.string(),
  status: AnswerStatusSchema,
  assessedById: z.number().nullable().optional(),
  feedback: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StudentAnswerDto = z.infer<typeof StudentAnswerDtoSchema>;

// Request DTOs
export const CreateCourseStepMaterialDtoSchema = z.object({
  courseStepId: z.number(),
  title: z.string(),
  description: z.string().optional(),
  type: MaterialTypeSchema,
  content: z.string().optional(),
  order: z.number(),
  question: z
    .object({
      questionText: z.string(),
      questionType: QuestionTypeSchema,
      options: z.record(z.string(), QuestionOptionSchema).optional().nullable(),
    })
    .optional(),
});
export type CreateCourseStepMaterialDto = z.infer<
  typeof CreateCourseStepMaterialDtoSchema
>;

export const UpdateCourseStepMaterialDtoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  order: z.number().optional(),
  question: z
    .object({
      questionText: z.string().optional(),
      questionType: QuestionTypeSchema.optional(),
      options: z.record(z.string(), QuestionOptionSchema).optional().nullable(),
    })
    .optional(),
});
export type UpdateCourseStepMaterialDto = z.infer<
  typeof UpdateCourseStepMaterialDtoSchema
>;

export const UpdateProgressDtoSchema = z.object({
  courseStepMaterialId: z.number(),
  studentPackageId: z.number(),
  status: ProgressStatusSchema,
});
export type UpdateProgressDto = z.infer<typeof UpdateProgressDtoSchema>;

export const SubmitAnswerDtoSchema = z.object({
  questionId: z.number(),
  answerContent: z.string(),
});
export type SubmitAnswerDto = z.infer<typeof SubmitAnswerDtoSchema>;

export const AssessAnswerDtoSchema = z.object({
  status: z.enum(["approved", "needs_revision"]),
  feedback: z.string().optional(),
});
export type AssessAnswerDto = z.infer<typeof AssessAnswerDtoSchema>;
