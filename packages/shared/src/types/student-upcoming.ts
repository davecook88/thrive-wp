import { z } from "zod";
import { MeetEventStatusSchema } from "./google-meet.js";

export const UpcomingSessionSchema = z.object({
  id: z.number().int().positive(),
  classType: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  teacherId: z.number().int().positive(),
  teacherName: z.string(),
  courseId: z.number().int().nullable().optional(),
  courseName: z.string().nullable().optional(),
  meetingUrl: z.string().url().nullable().optional(),
  meetStatus: MeetEventStatusSchema.nullable().optional(),
  status: z.string(),
});

export const UpcomingSessionsResponseSchema = z.array(UpcomingSessionSchema);

export type UpcomingSessionDto = z.infer<typeof UpcomingSessionSchema>;
export type UpcomingSessionsResponseDto = z.infer<
  typeof UpcomingSessionsResponseSchema
>;
