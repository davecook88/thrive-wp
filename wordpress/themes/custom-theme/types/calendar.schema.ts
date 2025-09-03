import z from "zod";

// Define the BaseCalendarEvent schema
const BaseCalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startUtc: z.string(), // ISODateTimeUTC
  endUtc: z.string(), // ISODateTimeUTC
  type: z.enum(["availability", "class", "booking", "blackout"]),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Define the thriveClient schema
const ThriveClientSchema = z.object({
  fetchAvailabilityPreview: z.function(), // Validates that it's a function
});

const CalendarApiSchema = z.object({
  thriveClient: ThriveClientSchema,
});
