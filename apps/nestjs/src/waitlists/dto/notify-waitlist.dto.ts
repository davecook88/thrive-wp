import { z } from "zod";

export const NotifyWaitlistSchema = z.object({
  expiresInHours: z.number().int().positive().optional().default(24),
});

export type NotifyWaitlistDto = z.infer<typeof NotifyWaitlistSchema>;
