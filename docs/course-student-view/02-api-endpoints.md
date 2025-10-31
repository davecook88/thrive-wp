# API Endpoints - Course Student View

## Overview

This document specifies all API endpoints required for the course student view, including public course discovery, cohort management, enrollment, and student course package management.

---

## Public Course Endpoints

### GET /course-programs/browse

**Purpose:** List all active, enrollable courses with optional filtering.

**Authentication:** None (public endpoint)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `levelId` | number | No | Filter courses by student level |
| `page` | number | No | Page number (default: 1) |
| `pageSize` | number | No | Items per page (default: 20, max: 100) |
| `sortBy` | string | No | Sort field: "startDate", "title", "price" (default: "startDate") |
| `sortOrder` | string | No | "asc" or "desc" (default: "asc") |

**Response:** 200 OK

```typescript
{
  items: CourseProgramListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

interface CourseProgramListItemDto {
  id: number;
  code: string;
  title: string;
  description: string | null;
  heroImageUrl: string | null;
  timezone: string;
  isActive: boolean;
  stepCount: number;
  priceInCents: number | null;
  stripePriceId: string | null;
  levels: { id: number; code: string; name: string }[];
  availableCohorts: number; // Count of cohorts with available spots
  nextCohortStartDate: string | null; // ISO date of soonest cohort
}
```

**Example Request:**

```bash
GET /course-programs/browse?levelId=2&page=1&pageSize=10
```

**Example Response:**

```json
{
  "items": [
    {
      "id": 1,
      "code": "SFZ",
      "title": "Spanish From Zero",
      "description": "Start your Spanish journey with fundamentals",
      "heroImageUrl": "https://example.com/images/sfz-hero.jpg",
      "timezone": "America/New_York",
      "isActive": true,
      "stepCount": 4,
      "priceInCents": 49900,
      "stripePriceId": "price_xyz123",
      "levels": [
        { "id": 1, "code": "BEGINNER", "name": "Beginner" }
      ],
      "availableCohorts": 2,
      "nextCohortStartDate": "2025-09-15"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

**Implementation Notes:**

- Filter out courses where `isActive = false`
- Calculate `availableCohorts` by counting cohorts where:
  - `isActive = true`
  - `enrollment_deadline > NOW()` or `enrollment_deadline IS NULL`
  - `current_enrollment < max_enrollment`
- `nextCohortStartDate` is MIN(start_date) of available cohorts
- Join with `course_program_level` to filter by level
- Use repository query builder with pagination

---

### GET /course-programs/:code

**Purpose:** Get detailed course information by code.

**Authentication:** None (public endpoint)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Course code (e.g., "SFZ") |

**Response:** 200 OK

```typescript
interface CourseProgramDetailDto {
  id: number;
  code: string;
  title: string;
  description: string | null;
  heroImageUrl: string | null;
  timezone: string;
  isActive: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
  priceInCents: number | null;
  steps: CourseStepDetailDto[];
  levels: { id: number; code: string; name: string }[];
}

interface CourseStepDetailDto {
  id: number;
  stepOrder: number;
  label: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  options: StepOptionDetailDto[];
}

interface StepOptionDetailDto {
  id: number;
  groupClassId: number;
  groupClassName: string;
  isActive: boolean;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  maxStudents: number;
  currentEnrollment: number;
  availableSeats: number;
}
```

**Example Request:**

```bash
GET /course-programs/SFZ
```

**Errors:**

- `404 Not Found` - Course code not found
- `403 Forbidden` - Course is not active (not published)

---

### GET /course-programs/:code/cohorts

**Purpose:** List all available cohorts for a course.

**Authentication:** None (public endpoint)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Course code |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeFullCohorts` | boolean | No | Show full cohorts (default: false) |

**Response:** 200 OK

```typescript
interface CourseCohortDto {
  id: number;
  courseProgramId: number;
  name: string;
  description: string | null;
  startDate: string; // ISO date
  endDate: string; // ISO date
  timezone: string;
  maxEnrollment: number;
  currentEnrollment: number;
  availableSpots: number;
  enrollmentDeadline: string | null; // ISO datetime
  isActive: boolean;
  isFull: boolean;
  isEnrollmentOpen: boolean; // false if past deadline or full
  sessionCount: number; // Total sessions in this cohort
}
```

**Example Response:**

```json
[
  {
    "id": 1,
    "courseProgramId": 1,
    "name": "Fall 2025 Cohort",
    "description": "Our fall semester starting in September",
    "startDate": "2025-09-15",
    "endDate": "2025-12-15",
    "timezone": "America/New_York",
    "maxEnrollment": 30,
    "currentEnrollment": 12,
    "availableSpots": 18,
    "enrollmentDeadline": "2025-09-14T23:59:59Z",
    "isActive": true,
    "isFull": false,
    "isEnrollmentOpen": true,
    "sessionCount": 4
  },
  {
    "id": 2,
    "courseProgramId": 1,
    "name": "Spring 2026 Cohort",
    "description": "Spring semester beginning in January",
    "startDate": "2026-01-20",
    "endDate": "2026-04-30",
    "timezone": "America/New_York",
    "maxEnrollment": 30,
    "currentEnrollment": 0,
    "availableSpots": 30,
    "enrollmentDeadline": "2026-01-19T23:59:59Z",
    "isActive": true,
    "isFull": false,
    "isEnrollmentOpen": true,
    "sessionCount": 4
  }
]
```

**Implementation Notes:**

- `isFull` = `currentEnrollment >= maxEnrollment`
- `isEnrollmentOpen` = `isActive && !isFull && (enrollmentDeadline === null || enrollmentDeadline > NOW())`
- `availableSpots` = `maxEnrollment - currentEnrollment`
- `sessionCount` = COUNT of `course_cohort_session` records for cohort
- Default filter out full cohorts unless `includeFullCohorts=true`

**Errors:**

- `404 Not Found` - Course code not found

---

### GET /course-programs/:code/cohorts/:cohortId/sessions

**Purpose:** Get all sessions for a specific cohort.

**Authentication:** None (public endpoint)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Course code |
| `cohortId` | number | Cohort ID |

**Response:** 200 OK

```typescript
interface CohortSessionDto {
  stepId: number;
  stepOrder: number;
  stepLabel: string;
  stepTitle: string;
  stepDescription: string | null;
  isRequired: boolean;
  courseStepOptionId: number;
  groupClassId: number;
  groupClassName: string;
  dayOfWeek: number;
  startTime: string; // HH:mm format
  endTime: string;
  timezone: string;
  maxStudents: number;
  currentEnrollment: number;
  availableSeats: number;
}
```

**Example Response:**

```json
[
  {
    "stepId": 1,
    "stepOrder": 1,
    "stepLabel": "SFZ-1",
    "stepTitle": "Introduction to Spanish",
    "stepDescription": "Basic greetings and pronunciation",
    "isRequired": true,
    "courseStepOptionId": 3,
    "groupClassId": 15,
    "groupClassName": "Spanish Basics - Monday Evening",
    "dayOfWeek": 1,
    "startTime": "18:00",
    "endTime": "19:00",
    "timezone": "America/New_York",
    "maxStudents": 30,
    "currentEnrollment": 12,
    "availableSeats": 18
  }
]
```

**Errors:**

- `404 Not Found` - Course or cohort not found
- `400 Bad Request` - Cohort does not belong to specified course

---

### GET /course-programs/:code/sessions

**Purpose:** Get all group class sessions linked to a course (for calendar display).

**Authentication:** None (public endpoint)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Course code |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `futureOnly` | boolean | No | Show only future sessions (default: true) |
| `cohortId` | number | No | Filter to specific cohort |
| `fromDate` | string | No | ISO date - start of range |
| `untilDate` | string | No | ISO date - end of range |

**Response:** 200 OK

```typescript
ClassEvent[] // Uses existing CalendarEvent type
```

**Example Response:**

```json
[
  {
    "id": "session-123",
    "type": "class",
    "serviceType": "COURSE",
    "title": "Spanish From Zero - SFZ-1",
    "startUtc": "2025-09-15T22:00:00Z",
    "endUtc": "2025-09-15T23:00:00Z",
    "courseId": "1",
    "cohortId": "1",
    "sessionId": "456",
    "groupClassId": 15,
    "capacityMax": 30,
    "enrolledCount": 12,
    "availableSpots": 18,
    "status": "SCHEDULED",
    "requiresEnrollment": true,
    "isFull": false,
    "teacher": {
      "id": 5,
      "name": "Maria Garcia",
      "avatarUrl": null
    }
  }
]
```

**Implementation Notes:**

- Query all `course_step_option` records linked to course steps
- Join with `group_class` to get recurring class info
- Generate session instances based on recurrence rules
- Filter by date range if specified
- Convert to `ClassEvent` format for calendar consumption
- Include `serviceType: "COURSE"` to distinguish from regular group classes

**Errors:**

- `404 Not Found` - Course code not found

---

## Enrollment Endpoints

### POST /course-programs/:code/cohorts/:cohortId/enroll

**Purpose:** Initiate enrollment in a cohort (creates Stripe checkout session).

**Authentication:** Required (student)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Course code |
| `cohortId` | number | Cohort ID |

**Request Body:**

```typescript
interface EnrollCohortDto {
  successUrl?: string; // Override default success URL
  cancelUrl?: string; // Override default cancel URL
}
```

**Response:** 200 OK

```typescript
interface CheckoutSessionResponse {
  sessionId: string; // Stripe checkout session ID
  url: string; // Redirect URL for Stripe checkout
}
```

**Example Request:**

```bash
POST /course-programs/SFZ/cohorts/1/enroll
Content-Type: application/json

{
  "successUrl": "https://example.com/enrollment/success",
  "cancelUrl": "https://example.com/courses/SFZ"
}
```

**Example Response:**

```json
{
  "sessionId": "cs_test_abc123",
  "url": "https://checkout.stripe.com/c/pay/cs_test_abc123"
}
```

**Implementation Notes:**

- Validate student is authenticated
- Check cohort is enrollable:
  - `isActive = true`
  - `current_enrollment < max_enrollment`
  - `enrollment_deadline > NOW()` or null
- Check student doesn't already own this course (prevent duplicate purchase)
- Create Stripe checkout session with:
  - Line item: course price from `stripe_price_id`
  - Metadata: `{ cohortId, courseProgramId, studentId, courseCode }`
  - Success URL includes checkout session ID for webhook verification
- Return checkout URL for client redirect

**Errors:**

- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Course or cohort not found
- `400 Bad Request` - Cohort full, past deadline, or student already enrolled
- `409 Conflict` - Student already owns this course

---

### POST /students/me/course-packages/:packageId/book-sessions

**Purpose:** Book cohort sessions after successful payment.

**Authentication:** Required (student)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `packageId` | number | StudentPackage ID |

**Request Body:**

```typescript
interface BookSessionsDto {
  selections: StepSelectionDto[];
}

interface StepSelectionDto {
  courseStepId: number;
  courseStepOptionId: number; // Which group class session to book
}
```

**Response:** 200 OK

```typescript
interface BookSessionsResponse {
  autoBooked: number[]; // Array of courseStepIds that were auto-booked
  manualSelections: number[]; // Array of courseStepIds requiring user selection
  booked: StudentCourseStepProgress[]; // Updated progress records
}
```

**Example Request:**

```bash
POST /students/me/course-packages/123/book-sessions
Content-Type: application/json

{
  "selections": [
    { "courseStepId": 2, "courseStepOptionId": 7 },
    { "courseStepId": 3, "courseStepOptionId": 12 }
  ]
}
```

**Example Response:**

```json
{
  "autoBooked": [1],
  "manualSelections": [2, 3],
  "booked": [
    {
      "id": 45,
      "studentPackageId": 123,
      "courseStepId": 1,
      "cohortId": 1,
      "status": "BOOKED",
      "sessionId": 789,
      "bookedAt": "2025-10-28T12:00:00Z",
      "completedAt": null
    },
    {
      "id": 46,
      "studentPackageId": 123,
      "courseStepId": 2,
      "cohortId": 1,
      "status": "BOOKED",
      "sessionId": 790,
      "bookedAt": "2025-10-28T12:00:05Z",
      "completedAt": null
    }
  ]
}
```

**Implementation Notes:**

- Validate student owns the package
- Get cohort from StudentCourseStepProgress records
- For each step in course:
  - Check if cohort has only one option for this step → auto-book
  - If multiple options and selection provided → book selected option
  - If multiple options and no selection → leave as UNBOOKED, add to manualSelections
- Create Session record for each booked step
- Update StudentCourseStepProgress: set sessionId, status=BOOKED, bookedAt
- Return summary of what was booked and what still needs selection

**Errors:**

- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Package not found or doesn't belong to student
- `400 Bad Request` - Invalid step ID or option ID
- `409 Conflict` - Session already booked, or session full

---

## Student Course Package Endpoints

### GET /students/me/course-packages

**Purpose:** Get all course packages owned by the authenticated student.

**Authentication:** Required (student)

**Response:** 200 OK

```typescript
interface StudentCoursePackage {
  packageId: number;
  packageName: string;
  courseProgramId: number;
  courseCode: string; // NEW FIELD
  courseTitle: string;
  courseDescription: string | null;
  cohortId: number | null; // NEW FIELD
  cohortName: string | null; // NEW FIELD
  purchasedAt: string; // ISO datetime
  expiresAt: string | null;
  progress: CourseStepProgressView[];
  completedSteps: number;
  totalSteps: number;
  unbookedSteps: number; // NEW FIELD - count of UNBOOKED steps
  nextSessionAt: string | null; // ISO datetime of next booked session
}

interface CourseStepProgressView {
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  stepOrder: number;
  status: "UNBOOKED" | "BOOKED" | "COMPLETED" | "MISSED" | "CANCELLED";
  bookedAt: string | null;
  completedAt: string | null;
  sessionId: number | null;
}
```

**Example Response:**

```json
[
  {
    "packageId": 123,
    "packageName": "Spanish From Zero - Fall 2025",
    "courseProgramId": 1,
    "courseCode": "SFZ",
    "courseTitle": "Spanish From Zero",
    "courseDescription": "Start your Spanish journey",
    "cohortId": 1,
    "cohortName": "Fall 2025 Cohort",
    "purchasedAt": "2025-08-15T10:30:00Z",
    "expiresAt": null,
    "progress": [
      {
        "stepId": 1,
        "stepLabel": "SFZ-1",
        "stepTitle": "Introduction",
        "stepOrder": 1,
        "status": "BOOKED",
        "bookedAt": "2025-08-15T10:35:00Z",
        "completedAt": null,
        "sessionId": 789
      },
      {
        "stepId": 2,
        "stepLabel": "SFZ-2",
        "stepTitle": "Basic Grammar",
        "stepOrder": 2,
        "status": "UNBOOKED",
        "bookedAt": null,
        "completedAt": null,
        "sessionId": null
      }
    ],
    "completedSteps": 0,
    "totalSteps": 4,
    "unbookedSteps": 3,
    "nextSessionAt": "2025-09-15T22:00:00Z"
  }
]
```

**Implementation Notes:**

- Query StudentPackage where studentId = authenticated student
- Filter by packageType = "COURSE" (if package type exists)
- Join with CourseProgram to get code, title, description
- Join with CourseCohort to get cohort info
- Join with StudentCourseStepProgress to get progress
- Calculate completedSteps, totalSteps, unbookedSteps
- Find nextSessionAt from earliest BOOKED session in future

---

### GET /students/me/course-packages/:packageId

**Purpose:** Get detailed information about a specific course package.

**Authentication:** Required (student)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `packageId` | number | StudentPackage ID |

**Response:** 200 OK

```typescript
interface StudentCoursePackageDetail extends StudentCoursePackage {
  cohortStartDate: string; // ISO date
  cohortEndDate: string; // ISO date
  courseHeroImageUrl: string | null;
  courseLevels: { id: number; code: string; name: string }[];
  sessions: CourseSessionDetail[]; // All sessions student has booked
}

interface CourseSessionDetail {
  sessionId: number;
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  groupClassName: string;
  startUtc: string; // ISO datetime
  endUtc: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  meetingUrl: string | null;
  teacherId: number;
  teacherName: string;
}
```

**Errors:**

- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Package not found or doesn't belong to student

---

### GET /students/me/course-sessions

**Purpose:** Get all course sessions the student has booked (for calendar integration).

**Authentication:** Required (student)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fromDate` | string | No | ISO date - start of range |
| `untilDate` | string | No | ISO date - end of range |

**Response:** 200 OK

```typescript
ClassEvent[] // Uses existing CalendarEvent type
```

**Example Response:**

```json
[
  {
    "id": "course-session-789",
    "type": "class",
    "serviceType": "COURSE",
    "title": "Spanish From Zero - SFZ-1",
    "startUtc": "2025-09-15T22:00:00Z",
    "endUtc": "2025-09-15T23:00:00Z",
    "courseId": "1",
    "cohortId": "1",
    "sessionId": "789",
    "groupClassId": 15,
    "status": "SCHEDULED",
    "teacher": {
      "id": 5,
      "name": "Maria Garcia"
    }
  }
]
```

**Implementation Notes:**

- Query StudentCourseStepProgress where studentId = authenticated student AND status = BOOKED
- Join with Session, GroupClass to get session details
- Convert to ClassEvent format
- Filter by date range if provided

---

## Admin Cohort Management Endpoints

### POST /admin/course-programs/:id/cohorts

**Purpose:** Create a new cohort for a course.

**Authentication:** Required (admin)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | CourseProgram ID |

**Request Body:**

```typescript
interface CreateCohortDto {
  name: string;
  description?: string | null;
  startDate: string; // ISO date
  endDate: string; // ISO date
  timezone?: string; // Defaults to course timezone
  maxEnrollment: number;
  enrollmentDeadline?: string | null; // ISO datetime
  isActive?: boolean; // Defaults to true
  sessionSelections: CohortSessionSelectionDto[];
}

interface CohortSessionSelectionDto {
  courseStepId: number;
  courseStepOptionId: number; // Which group class for this step
}
```

**Response:** 201 Created

```typescript
CourseCohortDto // Same as GET cohorts response
```

**Errors:**

- `401 Unauthorized` - Not authenticated as admin
- `404 Not Found` - Course not found
- `400 Bad Request` - Validation errors (missing steps, duplicate step, invalid dates)

---

### PUT /admin/course-programs/cohorts/:cohortId

**Purpose:** Update cohort details.

**Authentication:** Required (admin)

**Request Body:** Same as CreateCohortDto, all fields optional (partial update)

**Response:** 200 OK

**Errors:**

- `400 Bad Request` - Cannot reduce max_enrollment below current_enrollment

---

### DELETE /admin/course-programs/cohorts/:cohortId

**Purpose:** Delete (soft delete) a cohort.

**Authentication:** Required (admin)

**Response:** 204 No Content

**Implementation Notes:**

- Set `isActive = false` instead of hard delete
- Prevent deletion if any students have enrolled (current_enrollment > 0)

**Errors:**

- `409 Conflict` - Cohort has enrolled students

---

## Implementation Checklist

### Backend Services

- [ ] Create `CourseCohortService` with methods:
  - `findAvailableByCourseProgramId(courseProgramId, includeFullCohorts)`
  - `findOne(cohortId, relations)`
  - `create(courseProgramId, createDto)`
  - `update(cohortId, updateDto)`
  - `softDelete(cohortId)`
  - `incrementEnrollment(cohortId)` - with transaction locking
  - `getSessionsForCohort(cohortId)`

- [ ] Update `CourseProgramsService` with methods:
  - `browse(filters, pagination)`
  - `findByCodeWithDetails(code)`
  - `getCourseSessions(code, filters)`

- [ ] Update `CourseStepProgressService` with methods:
  - `seedProgressForCohort(studentPackageId, cohortId)`
  - `bookSessions(studentPackageId, selections)`
  - `getUnbookedSteps(studentPackageId)`

- [ ] Create `CourseEnrollmentService` with methods:
  - `createCheckoutSession(studentId, courseCode, cohortId)`
  - `handleCheckoutComplete(stripeSession)` - webhook handler

### Controllers

- [ ] Create `CourseDiscoveryController` (public routes)
  - `/course-programs/browse`
  - `/course-programs/:code`
  - `/course-programs/:code/cohorts`
  - `/course-programs/:code/cohorts/:cohortId/sessions`
  - `/course-programs/:code/sessions`

- [ ] Create `CourseEnrollmentController` (student routes)
  - `/course-programs/:code/cohorts/:cohortId/enroll`
  - `/students/me/course-packages/:packageId/book-sessions`

- [ ] Update `StudentController` (student routes)
  - `/students/me/course-packages`
  - `/students/me/course-packages/:packageId`
  - `/students/me/course-sessions`

- [ ] Create `AdminCohortController` (admin routes)
  - `/admin/course-programs/:id/cohorts`
  - `/admin/course-programs/cohorts/:cohortId`

### Types & DTOs

- [ ] Add to `/packages/shared/src/types/course-programs.ts`:
  - `CourseCohortDto`
  - `CohortSessionDto`
  - `EnrollCohortDto`
  - `CheckoutSessionResponse`
  - `BookSessionsDto`
  - `BookSessionsResponse`
  - `CreateCohortDto`
  - `UpdateCohortDto`

### Testing

- [ ] Unit tests for all service methods
- [ ] E2E tests for enrollment flow
- [ ] Test concurrent enrollment (race conditions)
- [ ] Test webhook idempotency
- [ ] Test capacity validation

---

## Next Steps

After implementing these endpoints:
1. Test all endpoints with Postman/curl
2. Generate API documentation (Swagger/OpenAPI)
3. Implement frontend components (see [03-course-list-block.md](./03-course-list-block.md))
