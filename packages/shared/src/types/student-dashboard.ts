import { z } from "zod";

export const DashboardSummarySchema = z.object({
  studentName: z.string(),
  nextSession: z
    .object({
      id: z.number(),
      startAt: z.string(), // ISO Date
      isStartingSoon: z.boolean(),
      joinUrl: z.string().optional(),
    })
    .nullable(),
  activeCourse: z
    .object({
      name: z.string(),
      progress: z.number(), // percent
      totalClasses: z.number(),
      completedClasses: z.number(),
    })
    .nullable(),
  creditBalance: z.number(),
  recommendedAction: z.enum([
    "JOIN_CLASS",
    "BOOK_SESSION",
    "BUY_CREDITS",
    "COMPLETE_PROFILE",
  ]),
});

export type DashboardSummaryDto = z.infer<typeof DashboardSummarySchema>;
