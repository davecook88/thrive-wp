# Implemented Features Inventory

This document provides a complete inventory of working features in the Thrive in Spanish platform as of November 19, 2025.

## Backend API (NestJS)

### Authentication & User Management

**AuthController** (`/auth`)
- `POST /auth/google` - Google OAuth initiation
- `GET /auth/google/callback` - OAuth callback handler
- `POST /auth/login` - Email/password login
- `POST /auth/register` - New user registration
- `POST /auth/introspect` - Session validation (used by Nginx)
- `POST /auth/logout` - Session termination

**UsersController** (`/users`)
- `GET /users` - List all users (admin)
- `GET /users/:id` - Get user details
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Soft delete user

### Teacher Management

**TeachersController** (`/teachers`)
- `GET /teachers` - List teachers (admin)
- `POST /teachers` - Create teacher (admin)
- `GET /teachers/:id` - Get teacher details
- `PATCH /teachers/:id` - Update teacher (admin)
- `DELETE /teachers/:id` - Soft delete teacher

**TeachersPublicController** (`/api/teachers/public`)
- `GET /` - Browse public teacher profiles
- `GET /:id` - Get public teacher profile

**TeachersProfileController** (`/teachers/profile`)
- `GET /me` - Get own profile (teacher self-service)
- `PATCH /me` - Update own profile
- `POST /availability` - Set availability

### Student Management

**StudentsController** (`/students`)
- `GET /students` - List students (admin)
- `POST /students` - Create student (admin)
- `GET /students/:id` - Get student details
- `PATCH /students/:id` - Update student

**StudentPackagesController** (`/students/me`)
- `GET /course-packages` - Get enrolled courses
- `GET /course-packages/:id` - Get course package details

### Sessions & Bookings

**SessionController** (`/sessions`)
- `GET /sessions` - List sessions with filters
- `POST /sessions` - Create session (admin/teacher)
- `GET /sessions/:id` - Get session details
- `PATCH /sessions/:id` - Update session
- `DELETE /sessions/:id` - Cancel session

**BookingsController** (`/bookings`)
- `POST /bookings` - Create booking
- `GET /bookings/:id` - Get booking details
- `PATCH /bookings/:id/cancel` - Cancel booking
- `GET /bookings/student/:studentId` - Get student's bookings

### Packages & Payments

**PackagesController** (`/packages`)
- `GET /` - List active packages
- `GET /:id` - Get package details
- `GET /valid-for-session/:sessionId` - Get valid packages for session
- `GET /my-credits` - Get student's credit balance

**AdminPackagesController** (`/admin/packages`)
- `POST /` - Create package
- `GET /` - List all packages
- `GET /:id` - Get package with details
- `PATCH /:id/deactivate` - Deactivate package

**PaymentsController** (`/payments`)
- `POST /create-session` - Create draft booking + PaymentIntent
- `POST /payment-intent` - Legacy payment intent creation

**WebhooksController** (`/webhooks`)
- `POST /stripe` - Handle Stripe webhooks
  - `payment_intent.succeeded` - Confirm booking
  - `payment_intent.payment_failed` - Cancel draft
  - `checkout.session.completed` - Process package purchase

### Course Programs

**CourseProgramsController** (`/course-programs`)
- `GET /browse` - Browse active courses with filters
- `GET /:code` - Get course by code
- `GET /:code/cohorts` - Get available cohorts
- `GET /:code/sessions` - Get course sessions

**AdminCourseProgramsController** (`/admin/course-programs`)
- `POST /` - Create course program
- `GET /` - List all courses
- `GET /:id` - Get course details
- `PATCH /:id` - Update course
- `DELETE /:id` - Delete course
- `POST /:id/steps` - Add step to course
- `PATCH /steps/:stepId` - Update step
- `DELETE /steps/:stepId` - Delete step

**EnrollmentController** (`/course-programs/:code/cohorts`)
- `POST /:cohortId/enroll` - Enroll in cohort (initiates Stripe checkout)

### Course Materials

**CourseMaterialsController** (`/course-materials`)
- `POST /admin/courses/:courseId/materials` - Create material (admin)
- `GET /courses/:courseId/curriculum` - Get course curriculum
- `POST /materials/progress` - Mark material complete
- `POST /questions/:questionId/answers` - Submit answer
- `GET /my/answers` - Get student's answers

### Group Classes

**GroupClassesController** (`/group-classes`)
- `GET /` - List group classes
- `POST /` - Create group class (admin)
- `GET /:id` - Get group class details
- `PATCH /:id` - Update group class
- `GET /available` - Get available sessions for booking

### Levels & Policies

**LevelsController** (`/levels`)
- `GET /` - List proficiency levels (A1-C2)
- `POST /` - Create level (admin)
- `PATCH /:id` - Update level

**PoliciesController** (`/policies`)
- `GET /` - Get booking policies
- `POST /` - Create policy (admin)
- `PATCH /:id` - Update policy

### Waitlists

**WaitlistsController** (`/waitlists`)
- `POST /` - Join waitlist
- `DELETE /:id` - Leave waitlist
- `GET /me` - Get student's waitlist entries
- `GET /session/:sessionId` - Get waitlist for session (admin)

---

## Frontend (WordPress)

### Gutenberg Blocks Inventory

#### Authentication & User Management
- **login-auth** - Login/register forms with Google OAuth integration

#### Student Dashboard (8 blocks)
- **student-dashboard-hero** - Welcome section with student stats
- **student-calendar** - Interactive calendar with session filtering
- **student-upcoming-sessions** - Widget showing next 5 sessions
- **student-class-credits** - Credit balance by service type
- **student-course-enrollments** - List of enrolled courses
- **student-package-details** - Detailed package view with usage history
- **student-stats-widget** - Statistics dashboard (sessions attended, completion rate)

#### Teacher Dashboard (6 blocks)
- **teacher-calendar** - Availability management (13 sub-components)
- **teacher-profile-form** - Profile editing interface
- **teacher-stats-widget** - Teacher performance metrics
- **teacher-info** - Display teacher information

#### Course Pages (8 blocks)
- **course-list** - Browse courses with level/price filtering
- **course-header** - Course title, description, pricing
- **course-cohorts** - Available cohorts with "Enroll" CTAs
- **course-sessions-calendar** - Embedded calendar for course sessions
- **course-details** - Rich content area for course description
- **course-materials** - Self-study curriculum view (8 sub-components)
- **course-detail** - Legacy course detail block

#### Booking Flows (10 blocks)
- **booking-session-details** - Session info during booking
- **booking-status** - Confirmation/error status display
- **booking-policy-notice** - Show booking policies
- **package-selection** - Choose package for booking
- **conditional-stripe-payment** - Stripe Payment Element integration
- **session-selection-wizard** - Multi-step session picker
- **private-session-availability-calendar** - Calendar for private bookings
- **selected-event-modal** - Event details modal (18 sub-components)
- **checkout-context** - Checkout state management

---

## Database Schema

### Core Tables (Complete)

**User Management**
- `user` - All users with role detection
- `student` - Student-specific data
- `teacher` - Teacher profiles and certifications
- `admin` - Admin-specific data

**Sessions & Bookings**
- `session` - Sessions with types (PRIVATE, GROUP, COURSE)
- `booking` - Student bookings with statuses
- `teacher_availability` - Teacher schedule blocks

**Packages & Credits**
- `stripe_product_map` - Maps Stripe products to metadata
- `student_package` - Purchased packages
- `package_use` - Credit usage records
- `package_allowance` - Bundle allowance definitions (NEW)

**Course Programs**
- `course_program` - Course definitions
- `course_step` - Steps within courses
- `course_step_option` - Group class options per step
- `course_cohort` - Cohort scheduling
- `course_cohort_session` - Pre-assigned sessions
- `student_course_step_progress` - Student progress tracking

**Course Materials**
- `course_material` - Learning materials (videos, files, questions)
- `material_question` - Question definitions
- `student_material_progress` - Completion tracking
- `student_answer` - Student submissions

**Group Classes**
- `level` - Proficiency levels (A1-C2)
- `group_class` - Group class definitions
- `group_class_teacher` - Teacher assignments

**Miscellaneous**
- `waitlist` - Waitlist for full sessions
- Migration history and other system tables

---

## Key Integrations

### Stripe
- ✅ Product and Price management
- ✅ Payment Intents for bookings
- ✅ Checkout Sessions for packages
- ✅ Webhook handling (payment_intent.*, checkout.session.*)
- ✅ Metadata-driven fulfillment

### Google OAuth
- ✅ Sign in with Google
- ✅ Account linking
- ✅ Profile data sync

### WordPress Media Library
- ✅ File uploads for course materials (backend ready)
- 🟡 Frontend integration partial

### Nginx
- ✅ Reverse proxy with auth introspection
- ✅ Header injection (`X-Auth-*` headers)
- ✅ Session cookie validation

---

## What's NOT Implemented

See [03-mvp-gaps.md](./03-mvp-gaps.md) for detailed gap analysis.

**Quick Summary:**
- ⏳ Admin UI for course curriculum building
- ⏳ Course enrollment end-to-end flow
- ⏳ Teacher assessment dashboard
- ⏳ Bundle packages service refactoring
- ⏳ Group classes admin UI
- ⏳ Group classes student booking
- ⏳ Advanced calendar filtering
- ⏳ Notification system

---

*Last updated: November 19, 2025*
