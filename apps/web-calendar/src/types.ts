export type ISODateTimeUTC = string; // e.g., '2025-09-01T14:00:00Z'

export type ViewMode = "week" | "day" | "month" | "list";
export type UIMode = "admin" | "teacher" | "student" | "public";
export type EventType = "availability" | "class" | "booking" | "blackout";

// Class types - these should match the backend ServiceType enum
export type ServiceType = "PRIVATE" | "GROUP" | "COURSE";

export interface BaseCalendarEvent {
  id: string;
  title: string;
  startUtc: ISODateTimeUTC;
  endUtc: ISODateTimeUTC;
  type: EventType;
  teacherId?: string;
  studentId?: string;
  description?: string;
  isActive?: boolean;
}

export interface ClassEvent extends BaseCalendarEvent {
  type: "class";
  classType: "PRIVATE" | "GROUP" | "COURSE";
  capacityMax: number;
  enrolledCount?: number;
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED";
  courseId?: string;
  meetingUrl?: string;
  requiresEnrollment?: boolean;
}

export interface BookingEvent extends BaseCalendarEvent {
  type: "booking";
  sessionId: string;
  status: "INVITED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "FORFEIT";
  cancellationReason?: string;
}

export interface AvailabilityEvent extends BaseCalendarEvent {
  type: "availability";
  // Optional metadata for availability slots
  capacityMax?: number;
}

export interface BlackoutEvent extends BaseCalendarEvent {
  type: "blackout";
  reason?: string;
}

export type CalendarEvent =
  | ClassEvent
  | BookingEvent
  | AvailabilityEvent
  | BlackoutEvent;

export interface CalendarRange {
  startUtc: ISODateTimeUTC;
  endUtc: ISODateTimeUTC;
  timezone: string; // IANA timezone, e.g., 'America/New_York'
}

export interface SlotCandidate {
  teacherId: string;
  startUtc: ISODateTimeUTC;
  endUtc: ISODateTimeUTC;
}
