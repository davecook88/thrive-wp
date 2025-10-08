import { Session } from '../../sessions/entities/session.entity.js';
import { GroupClass } from '../entities/group-class.entity.js';
import { Level } from '../../levels/entities/level.entity.js';

/**
 * DTO representing a Session with dynamically loaded enrollment count.
 * This type is used when TypeORM's loadRelationCountAndMap adds the enrolledCount property at runtime.
 */
export type SessionWithEnrollment = Session & {
  enrolledCount: number;
};

/**
 * Response DTO for available group class sessions with enrollment details.
 */
export interface SessionWithEnrollmentResponse {
  id: number;
  type: string;
  startAt: Date;
  endAt: Date;
  capacityMax: number;
  status: string;
  meetingUrl: string | null;
  teacherId: number;
  groupClassId: number | null;
  groupClass: GroupClass | null;
  enrolledCount: number;
  availableSpots: number;
  isFull: boolean;
  canJoinWaitlist: boolean;
}
