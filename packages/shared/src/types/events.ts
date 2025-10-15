import { LevelDto as Level } from "./level.js";
import { PublicTeacherDto } from "./teachers.js";

export type ISODateTimeUTC = string; // e.g., '2025-09-01T14:00:00Z'
export type EventType = "availability" | "class" | "booking" | "blackout";

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
  // Group class specific properties
  isFull?: boolean;
  canJoinWaitlist?: boolean;
  availableSpots?: number;
  groupClassId?: number;
  level?: Level;
  sessionId?: string; // For group classes, this is the session ID
  teacher?: PublicTeacherDto;
}

export interface BookingEvent extends BaseCalendarEvent {
  type: "booking";
  sessionId: string;
  status: "INVITED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "FORFEIT";
  cancellationReason?: string;
  // Additional properties from API
  teacherId?: number;
  teacherName?: string;
  classType?: "PRIVATE" | "GROUP" | "COURSE";
  bookingId?: number;
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

// Type guards for CalendarEvent types
export function isClassEvent(event: CalendarEvent): event is ClassEvent {
  return event.type === "class";
}

export function isBookingEvent(event: CalendarEvent): event is BookingEvent {
  return event.type === "booking";
}

export function isAvailabilityEvent(
  event: CalendarEvent,
): event is AvailabilityEvent {
  return event.type === "availability";
}

export function isBlackoutEvent(event: CalendarEvent): event is BlackoutEvent {
  return event.type === "blackout";
}

// Type guards for ClassEvent service types
export function isPrivateClassEvent(
  event: CalendarEvent,
): event is ClassEvent & { serviceType: "PRIVATE" } {
  return isClassEvent(event) && event.serviceType === "PRIVATE";
}

export function isGroupClassEvent(
  event: CalendarEvent,
): event is ClassEvent & { serviceType: "GROUP" } {
  return isClassEvent(event) && event.serviceType === "GROUP";
}

export function isCourseClassEvent(
  event: CalendarEvent,
): event is ClassEvent & { serviceType: "COURSE" } {
  return isClassEvent(event) && event.serviceType === "COURSE";
}
