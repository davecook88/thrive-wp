import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateMaterialQuestionSchema = z.object({
  questionText: z.string().min(1),
  questionType: z.enum([
    "multiple_choice",
    "long_text",
    "file_upload",
    "video_upload",
  ]),
  options: z.record(z.string(), z.any()).optional(),
});

export const CreateCourseStepMaterialSchema = z.object({
  courseStepId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(["file", "video_embed", "rich_text", "question"]),
  content: z.string().optional(),
  order: z.number().int().min(0),
  question: CreateMaterialQuestionSchema.optional(),
});

export class CreateCourseStepMaterialDto extends createZodDto(
  CreateCourseStepMaterialSchema,
) {}
