import { z } from "zod";

export const PromoteWaitlistSchema = z.object({
  studentPackageId: z.number().int().positive().optional(),
});

export type PromoteWaitlistDto = z.infer<typeof PromoteWaitlistSchema>;
