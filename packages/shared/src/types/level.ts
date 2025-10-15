import { z } from "zod";

export const LevelSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

export type LevelDto = z.infer<typeof LevelSchema>;
