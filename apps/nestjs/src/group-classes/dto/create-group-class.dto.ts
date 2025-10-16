import { z } from "zod";

export const CreateGroupClassSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  levelIds: z.array(z.number().int().positive()),
  capacityMax: z.number().int().positive().optional(),
  teacherIds: z.array(z.number().int().positive()),
  primaryTeacherId: z.number().int().positive().nullable().optional(),
  rrule: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  sessions: z
    .array(
      z.object({
        startAt: z.string(),
        endAt: z.string(),
      }),
    )
    .optional(),
});

export type CreateGroupClassDto = z.infer<typeof CreateGroupClassSchema>;
