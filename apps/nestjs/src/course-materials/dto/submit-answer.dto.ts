import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const SubmitAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  answerContent: z.string().min(1),
});

export class SubmitAnswerDto extends createZodDto(SubmitAnswerSchema) {}
