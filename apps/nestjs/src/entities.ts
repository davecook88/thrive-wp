// This file exports all entities
// This allows TypeORM to use them directly without glob patterns
// which works perfectly with Vitest/SWC transformation

// Common
export { BaseEntity } from "./common/entities/base.entity.js";

// Users & Auth
export { User } from "./users/entities/user.entity.js";
export { Admin } from "./users/entities/admin.entity.js";
export { Student } from "./students/entities/student.entity.js";
export { Teacher } from "./teachers/entities/teacher.entity.js";
export { TeacherAvailability } from "./teachers/entities/teacher-availability.entity.js";

// Classes & Sessions
export { Session } from "./sessions/entities/session.entity.js";

// Group Classes
export { GroupClass } from "./group-classes/entities/group-class.entity.js";
export { GroupClassLevel } from "./group-classes/entities/group-class-level.entity.js";
export { GroupClassTeacher } from "./group-classes/entities/group-class-teacher.entity.js";

// Packages
export { StudentPackage } from "./packages/entities/student-package.entity.js";
export { PackageUse } from "./packages/entities/package-use.entity.js";
export { PackageAllowance } from "./packages/entities/package-allowance.entity.js";

// Payments & Orders
export { Booking } from "./payments/entities/booking.entity.js";
export { Order } from "./payments/entities/order.entity.js";
export { OrderItem } from "./payments/entities/order-item.entity.js";
export { StripeProductMap } from "./payments/entities/stripe-product-map.entity.js";

// Policies
export { CancellationPolicy } from "./policies/entities/cancellation-policy.entity.js";

// Course Programs
export { CourseProgram } from "./course-programs/entities/course-program.entity.js";
export { CourseStep } from "./course-programs/entities/course-step.entity.js";
export { CourseStepOption } from "./course-programs/entities/course-step-option.entity.js";
export { StudentCourseStepProgress } from "./course-programs/entities/student-course-step-progress.entity.js";
export { CourseProgramLevel } from "./course-programs/entities/course-program-level.entity.js";
export { CourseCohort } from "./course-programs/entities/course-cohort.entity.js";
export { CourseCohortSession } from "./course-programs/entities/course-cohort-session.entity.js";

// Course Materials
export { CourseStepMaterial } from "./course-materials/entities/course-step-material.entity.js";
export { MaterialQuestion } from "./course-materials/entities/material-question.entity.js";
export { StudentCourseStepMaterialProgress } from "./course-materials/entities/student-course-step-material-progress.entity.js";
export { StudentAnswer } from "./course-materials/entities/student-answer.entity.js";

// Session Materials
export { SessionMaterial } from "./session-materials/entities/session-material.entity.js";

// Levels
export { Level } from "./levels/entities/level.entity.js";

// Waitlists
export { Waitlist } from "./waitlists/entities/waitlist.entity.js";

// Notifications
export { Notification } from "./notifications/entities/notification.entity.js";

// Testimonials
export { Testimonial } from "./testimonials/entities/testimonial.entity.js";

// Google Meet
export { TeacherGoogleCredential } from "./google-meet/entities/teacher-google-credential.entity.js";
export { SessionMeetEvent } from "./google-meet/entities/session-meet-event.entity.js";
