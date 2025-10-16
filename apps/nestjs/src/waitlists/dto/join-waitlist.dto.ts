import { z } from "zod";

export const JoinWaitlistSchema = z.object({
  sessionId: z.number().int().positive(),
});

export type JoinWaitlistDto = z.infer<typeof JoinWaitlistSchema>;
