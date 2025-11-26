import { z } from "zod";
import { MeetEventStatusSchema } from "./google-meet.js";

export const TeacherSessionSchema = z.object({
  id: z.number().int().positive(),
  class_type: z.string(),
  start_at: z.string(),
  end_at: z.string(),
  status: z.string(),
  student_id: z.number().int().positive(),
  meeting_url: z.url().nullable().optional(),
  meet_status: MeetEventStatusSchema.nullable().optional(),
  student_name: z.string(),
});

export const TeacherSessionsResponseSchema = z.array(TeacherSessionSchema);

export type TeacherSessionDto = z.infer<typeof TeacherSessionSchema>;
export type TeacherSessionsResponseDto = z.infer<
  typeof TeacherSessionsResponseSchema
>;
