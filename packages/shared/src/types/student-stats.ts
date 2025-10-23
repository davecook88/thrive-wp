import { z } from "zod";

export const StudentStatsNextSessionSchema = z.object({
  id: z.number().int().positive(),
  classType: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  teacherId: z.number().int().positive(),
  teacherName: z.string(),
  courseId: z.number().int().nullable(),
  meetingUrl: z.string().url().nullable(),
});

export const StudentStatsResponseSchema = z.object({
  nextSession: StudentStatsNextSessionSchema.nullable(),
  totalCompleted: z.number().int().min(0),
  totalScheduled: z.number().int().min(0),
  activeCourses: z.number().int().min(0),
});

export type StudentStatsNextSessionDto = z.infer<
  typeof StudentStatsNextSessionSchema
>;
export type StudentStatsResponseDto = z.infer<
  typeof StudentStatsResponseSchema
>;
