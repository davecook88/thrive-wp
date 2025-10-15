// Local type definitions for CalendarEvent to avoid import issues

import { BaseCalendarEvent, CalendarEvent } from "@thrive/shared";

// Event types for thrive-calendar CustomEvents
export interface CalendarEventClickDetail {
  event: CalendarEvent;
}

export interface CalendarRangeChangeDetail {
  fromDate?: string;
  untilDate?: string;
}

export type CalendarEventClickEvent = CustomEvent<CalendarEventClickDetail>;
export type CalendarRangeChangeEvent = CustomEvent<CalendarRangeChangeDetail>;

// Minimal client contract exposed on context. Avoid direct imports to prevent cycles.

export type CalendarView = "week" | "day" | "month" | "list";

export interface ThriveCalendarElement extends HTMLElement {
  fromDate: string; // UTC ISO inclusive start
  untilDate: string; // UTC ISO exclusive end
  events: BaseCalendarEvent[];

  // Event listener overloads for calendar-specific events
  addEventListener(
    type: "event:click",
    listener: (event: CalendarEventClickEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: "range:change",
    listener: (event: CalendarRangeChangeEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;

  removeEventListener(
    type: "event:click",
    listener: (event: CalendarEventClickEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: "range:change",
    listener: (event: CalendarRangeChangeEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
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
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface Teacher {
  userId: number;
  teacherId: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  birthplace?: TeacherLocation | null;
  currentLocation?: TeacherLocation | null;
  specialties?: string[] | null;
  yearsExperience?: number | null;
  languagesSpoken?: string[] | null;
}
