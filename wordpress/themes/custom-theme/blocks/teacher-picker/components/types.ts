// Local type definitions for CalendarEvent to avoid import issues
export type ISODateTimeUTC = string; // e.g., '2025-09-01T14:00:00Z'
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

export interface ThriveCalendarContextApi {
  readonly id: string;
  setEventsFromTeacherAvailability(
    startIso: string,
    endIso: string,
    events: CalendarEvent[]
  ): void;
  setSelectedTeacherId(teacherId: string | undefined): void;
  ensureRange(start: Date, end: Date): Promise<void>;
}

export class CalendarContextNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarContextNotFoundError";
  }
}

export class InvalidCalendarContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCalendarContextError";
  }
}
