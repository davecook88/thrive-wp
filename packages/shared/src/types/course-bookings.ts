import { BookingStatus } from "./bookings.js";

/**
 * Type of booking
 */
export type BookingType = "DROP_IN" | "COURSE_STEP" | "WORKSHOP";

/**
 * Available session option for a course step
 */
export interface CourseStepSessionOption {
  courseStepOptionId: number;
  sessionId: number; // Actual Session.id
  groupClassId: number;
  groupClassName: string;
  startAt: string;
  endAt: string;
  capacityMax: number;
  spotsAvailable: number;
  isActive: boolean;
  teacherName: string;
}

/**
 * Step with available session options
 */
export interface UnbookedCourseStep {
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  stepOrder: number;
  isRequired: boolean;
  options: CourseStepSessionOption[];
}

/**
 * Booking response for course step
 */
export interface CourseStepBookingResponse {
  booking: {
    id: number;
    sessionId: number;
    status: BookingStatus;
    bookingType: "COURSE_STEP";
    courseStepId: number;
    studentPackageId: number;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  };
  progress: {
    id: number;
    courseStepId: number;
    status: "BOOKED";
    bookingId: number;
    sessionId: number;
    bookedAt: string;
  };
}

/**
 * Bulk booking response
 */
export interface BulkCourseStepBookingResponse {
  bookings: CourseStepBookingResponse[];
  autoBooked: number[]; // Step IDs auto-booked
  manualSelections: number[]; // Step IDs manually selected
}

/**
 * Request to book a single step session
 */
export interface BookStepSessionRequest {
  courseStepOptionId: number;
}

/**
 * Request to change an existing step session
 */
export interface ChangeStepSessionRequest {
  courseStepOptionId: number;
}

/**
 * Request to cancel a step booking
 */
export interface CancelStepBookingRequest {
  reason?: string;
}

/**
 * Individual step selection for bulk booking
 */
export interface StepSelection {
  courseStepId: number;
  courseStepOptionId: number;
}

/**
 * Request to bulk book step sessions
 */
export interface BulkBookSessionsRequest {
  selections: StepSelection[];
}
