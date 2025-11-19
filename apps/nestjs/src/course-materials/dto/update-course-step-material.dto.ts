import { createZodDto } from "nestjs-zod";
import {
  CreateCourseStepMaterialSchema,
  CreateMaterialQuestionSchema,
} from "./create-course-step-material.dto.js";

const UpdateMaterialQuestionSchema = CreateMaterialQuestionSchema.partial();

export const UpdateCourseStepMaterialSchema =
  CreateCourseStepMaterialSchema.partial()
    .omit({
      courseStepId: true,
    })
    .extend({
      question: UpdateMaterialQuestionSchema.optional(),
    });

export class UpdateCourseStepMaterialDto extends createZodDto(
  UpdateCourseStepMaterialSchema,
) {}
