import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UpdateProgressSchema = z.object({
  courseStepMaterialId: z.number().int().positive(),
  studentPackageId: z.number().int().positive(),
  status: z.enum(["not_started", "in_progress", "completed"]),
});

export class UpdateProgressDto extends createZodDto(UpdateProgressSchema) {}
