import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const AssessAnswerSchema = z.object({
  status: z.enum(["approved", "needs_revision"]),
  feedback: z.string().min(1),
});

export class AssessAnswerDto extends createZodDto(AssessAnswerSchema) {}
