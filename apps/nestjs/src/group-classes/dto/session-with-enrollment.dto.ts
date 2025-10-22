import { Session } from "../../sessions/entities/session.entity.js";

/**
 * DTO representing a Session with dynamically loaded enrollment count.
 * This type is used when TypeORM's loadRelationCountAndMap adds the enrolledCount property at runtime.
 */
export type SessionWithEnrollment = Session & {
  enrolledCount: number;
};

/**
 * Use the shared SessionWithEnrollmentResponse type from @thrive/shared
 * Re-exported here for backwards compatibility with NestJS code
 */
export type { SessionWithEnrollmentResponse } from "@thrive/shared";
