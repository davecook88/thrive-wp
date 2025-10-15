// This file exports all entities
// This allows TypeORM to use them directly without glob patterns
// which works perfectly with Vitest/SWC transformation

// Common
export { BaseEntity } from "./common/entities/base.entity.js";

// Users & Auth
export { User } from "./users/entities/user.entity.js";
export { Admin } from "./courses/entities/admin.entity.js";
export { Student } from "./students/entities/student.entity.js";
export { Teacher } from "./teachers/entities/teacher.entity.js";
export { TeacherAvailability } from "./teachers/entities/teacher-availability.entity.js";

// Classes & Sessions
export { Session } from "./sessions/entities/session.entity.js";
export { Course } from "./courses/entities/course.entity.js";
export { CourseTeacher } from "./course-teachers/entities/course-teacher.entity.js";
export { CourseEnrollment } from "./enrollments/entities/course-enrollment.entity.js";

// Group Classes
export { GroupClass } from "./group-classes/entities/group-class.entity.js";
export { GroupClassLevel } from "./group-classes/entities/group-class-level.entity.js";
export { GroupClassTeacher } from "./group-classes/entities/group-class-teacher.entity.js";

// Packages
export { StudentPackage } from "./packages/entities/student-package.entity.js";
export { PackageUse } from "./packages/entities/package-use.entity.js";

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
export { CourseBundleComponent } from "./course-programs/entities/course-bundle-component.entity.js";
export { StudentCourseEnrollment } from "./course-programs/entities/student-course-enrollment.entity.js";
export { StudentCourseProgress } from "./course-programs/entities/student-course-progress.entity.js";

// Levels
export { Level } from "./levels/entities/level.entity.js";

// Waitlists
export { Waitlist } from "./waitlists/entities/waitlist.entity.js";
