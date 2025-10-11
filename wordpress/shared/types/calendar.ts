import { thriveClient } from "../clients/thrive";

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
  studentId?: string;
  description?: string;
  isActive?: boolean;
}

export interface ClassEvent extends BaseCalendarEvent {
  type: "class";
  serviceType: "PRIVATE" | "GROUP" | "COURSE";
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
  teacherIds: number[];
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

// Minimal client contract exposed on context. Avoid direct imports to prevent cycles.

export type CalendarView = "week" | "day" | "month" | "list";

export interface ThriveCalendarElement extends HTMLElement {
  fromDate: string; // UTC ISO inclusive start
  untilDate: string; // UTC ISO exclusive end
  events: BaseCalendarEvent[];
}

export interface ThriveCalendarContextApi {
  // Identity
  readonly id: string;

  // Data (read-only views)
  readonly events: ReadonlyArray<BaseCalendarEvent>;
  readonly selectedEvent: BaseCalendarEvent | null;
  readonly view: CalendarView;
  readonly anchor: Date;
  readonly selectedTeacherId?: string;

  // Client for API calls
  readonly thriveClient: typeof thriveClient;

  // Data mutation utilities
  // setEventsFromTeacherAvailability(
  //   startIso: string,
  //   endIso: string,
  //   events: BaseCalendarEvent[]
  // ): void;
  setSelectedTeacherId(teacherId: string | undefined): void;
  setSelectedEvent(event: BaseCalendarEvent | null): void;

  // Callback registration for date range changes
  registerDateRangeChangeCallback(
    callback: (
      start: Date,
      end: Date
    ) => BaseCalendarEvent[] | Promise<BaseCalendarEvent[]>
  ): void;
  unregisterDateRangeChangeCallback(
    callback: (
      start: Date,
      end: Date
    ) => BaseCalendarEvent[] | Promise<BaseCalendarEvent[]>
  ): void;

  // Navigation/view helpers (calendar blocks can call these and then refetch/ensure as needed)
  setView(view: CalendarView): void;
  goToToday(): void;
  navigate(direction: "next" | "prev"): void;
  setAnchor(date: Date): void;

  // Calendar element registration (for range propagation and lifecycle)
  registerCalendar(el: ThriveCalendarElement): void;
  unregisterCalendar(el: ThriveCalendarElement): void;
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

export interface TeacherLocation {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface Teacher {
  userId: number;
  teacherId: number;
  firstName: string;
  lastName: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  birthplace: TeacherLocation | null;
  currentLocation: TeacherLocation | null;
  specialties: string[] | null;
  yearsExperience: number | null;
  languagesSpoken: string[] | null;
}

export interface Level {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}
