# Scheduling & Classes Schema (Proposal)

Scope: model the three delivery types — PRIVATE, GROUP, COURSE — with UTC time handling, soft deletes, singular table names, and snake_case columns. Courses can exist without sessions (future: materials-only access). This document guides the initial migrations and API contracts.

Design goals
- One source of truth for scheduled sessions (class table) regardless of type
- Courses as a top-level container that may have zero or many scheduled sessions
- Simple, enforceable capacity and booking rules with room for waitlist/policies later
- Efficient querying by teacher, student, course, and time windows

Key tables
1) course
- Represents a program/container. May have zero sessions. Enrollment is tracked independently of sessions.

Columns
- id int PK AUTO_INCREMENT
- slug varchar(191) UNIQUE — human-friendly identifier
- title varchar(255) NOT NULL
- description text NULL
- is_active tinyint(1) NOT NULL DEFAULT 1
- enrollment_opens_at datetime(3) NULL (UTC)
- enrollment_closes_at datetime(3) NULL (UTC)
- created_at, updated_at datetime(3) NOT NULL, deleted_at datetime(3) NULL
Notes: associate teachers via course_teacher (many-to-many).
Indexes: IDX_course_slug_unique, IDX_course_active

2) session
- A scheduled, bookable session. Covers all three types via type enum.

Columns
- id int PK AUTO_INCREMENT
- type enum('PRIVATE','GROUP','COURSE') NOT NULL
- course_id int NULL — set for course sessions; NULL for non-course sessions
- teacher_id int NOT NULL — instructor delivering the session
- created_from_availability_id int NULL — optional FK to teacher_availability used to create this session
- start_at datetime(3) NOT NULL (UTC)
- end_at datetime(3) NOT NULL (UTC) — prefer explicit end over duration to avoid DST math
- capacity_max smallint unsigned NOT NULL DEFAULT 1 — default 1 for PRIVATE; >1 for GROUP/COURSE or small private groups
- status enum('SCHEDULED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED'
- visibility enum('PUBLIC','PRIVATE','HIDDEN') NOT NULL DEFAULT 'PUBLIC'
- requires_enrollment tinyint(1) NOT NULL DEFAULT 0 — if 1 and type='COURSE', only enrolled students can book/view
- meeting_url varchar(500) NULL — provider join link (GC/Meet/Zoom/etc.)
- source_timezone varchar(64) NULL — original tz of creator (diagnostics only)
- created_at, updated_at datetime(3) NOT NULL, deleted_at datetime(3) NULL
Indexes:
- IDX_session_teacher_time (teacher_id, start_at)
- IDX_session_course_time (course_id, start_at)
- IDX_session_time (start_at)
FKs: teacher_id → teacher(id), course_id → course(id), created_from_availability_id → teacher_availability(id)

Notes
- PRIVATE replaces ONE_ON_ONE: default capacity_max is 1, but can be >1 for small private groups. Listing/visibility stays PRIVATE so only allowed participants and staff can access.
- GROUP vs COURSE: both are scheduled sessions; COURSE indicates linkage to course_id (not required, but recommended). For COURSE sessions, set requires_enrollment=1 when they should not be bookable by the public.
- Courses may have no sessions; class rows are optional for a course.
- Availability handling: when creating a PRIVATE session from a teacher’s slot, set created_from_availability_id. Do NOT create BLACKOUT entries; availability is computed as (availability rules) minus (existing class intervals).

3) booking
- A student’s seat in a class session.

Columns
- id int PK AUTO_INCREMENT
- session_id int NOT NULL
- student_id int NOT NULL
- status enum('INVITED','CONFIRMED','CANCELLED','NO_SHOW','FORFEIT') NOT NULL DEFAULT 'CONFIRMED'
- cancelled_at datetime(3) NULL (UTC)
- cancellation_reason varchar(500) NULL
- invited_at datetime(3) NULL, accepted_at datetime(3) NULL
- created_at, updated_at datetime(3) NOT NULL, deleted_at datetime(3) NULL
Constraints
- UNIQUE active seat per student per class: 
	- Add unique index on (class_id, student_id) where deleted_at IS NULL
	- In MySQL without partial indexes, enforce in app layer; still add plain unique and rely on soft delete by copying to archive if needed
Indexes: IDX_booking_session, IDX_booking_student
FKs: session_id → session(id), student_id → student(id)

## Student-Session Relationships by Service Type

Students are related to sessions through the `booking` table, which represents a student's seat/reservation in a session. This creates a **many-to-many relationship** where one student can book multiple sessions, and one session can have multiple students (up to `capacity_max`). The relationship works differently for each service type:

### PRIVATE Sessions
- **Relationship**: Direct booking via `booking` table
- **Capacity**: Usually 1 (one-to-one), but can be >1 for small private groups
- **Visibility**: `visibility='PRIVATE'` - only teacher, admins, and invited participants can access
- **Booking Process**: 
  - Student-initiated: Student books from teacher's availability → creates session + booking with `status='CONFIRMED'`
  - Teacher-initiated: Teacher creates session → creates booking with `status='INVITED'` → student accepts → status becomes `'CONFIRMED'`
- **Query Example**: Find student's private sessions
  ```sql
  SELECT s.* FROM session s 
  JOIN booking b ON s.id = b.session_id 
  WHERE b.student_id = ? AND s.type = 'PRIVATE' AND b.status = 'CONFIRMED' AND s.deleted_at IS NULL
  ```

### GROUP Sessions  
- **Relationship**: Direct booking via `booking` table
- **Capacity**: >1 (multiple students per session)
- **Visibility**: Usually `visibility='PUBLIC'` - appears in public catalog
- **Booking Process**: Student books directly → creates booking with `status='CONFIRMED'` → enforces `COUNT(bookings) < capacity_max`
- **Query Example**: Find student's group sessions
  ```sql
  SELECT s.* FROM session s 
  JOIN booking b ON s.id = b.session_id 
  WHERE b.student_id = ? AND s.type = 'GROUP' AND b.status = 'CONFIRMED' AND s.deleted_at IS NULL
  ```

### COURSE Sessions
- **Relationship**: Two-tier relationship system
  1. **Course Enrollment** (optional): Student enrolls in course via `course_enrollment` table
  2. **Session Booking**: Student books specific sessions via `booking` table
- **Capacity**: >1 (multiple students per session)
- **Visibility**: Controlled by `requires_enrollment` flag
  - `requires_enrollment=0`: Public booking like GROUP sessions
  - `requires_enrollment=1`: Only enrolled students can book/view
- **Booking Process**: 
  - If `requires_enrollment=1`: Must have `course_enrollment` record first, then can book sessions
  - If `requires_enrollment=0`: Can book directly like GROUP sessions
- **Query Example**: Find student's course sessions (with enrollment check)
  ```sql
  SELECT s.* FROM session s 
  JOIN booking b ON s.id = b.session_id 
  LEFT JOIN course_enrollment ce ON ce.course_id = s.course_id AND ce.student_id = b.student_id
  WHERE b.student_id = ? AND s.type = 'COURSE' AND b.status = 'CONFIRMED' 
  AND s.deleted_at IS NULL AND (s.requires_enrollment = 0 OR ce.status = 'ACTIVE')
  ```

### Relationship Summary Table

| Service Type | Relationship Table | Enrollment Required | Capacity | Visibility |
|-------------|-------------------|-------------------|----------|------------|
| PRIVATE | `booking` | No | 1 (usually) | PRIVATE |
| GROUP | `booking` | No | >1 | PUBLIC |
| COURSE | `booking` + `course_enrollment` | Optional (via `requires_enrollment`) | >1 | PUBLIC/PRIVATE/HIDDEN |

### Key Relationship Rules
1. **Unique Constraint**: One active booking per student per session (`UNIQUE(session_id, student_id)`)
2. **Capacity Enforcement**: `COUNT(bookings WHERE status='CONFIRMED') < capacity_max`
3. **Soft Deletes**: All relationships respect `deleted_at IS NULL` filtering
4. **Status Tracking**: Booking status tracks participation state ('CONFIRMED', 'CANCELLED', etc.)
5. **Cascade Deletes**: Deleting a session cascades to delete related bookings

4) waitlist (optional v1.1)
- Holds queued students for a full class.

Columns
- id int PK AUTO_INCREMENT
- class_id int NOT NULL
- student_id int NOT NULL
- position int NOT NULL
- created_at, updated_at datetime(3) NOT NULL, deleted_at datetime(3) NULL
Constraints
- UNIQUE (class_id, student_id)
Indexes: IDX_waitlist_class_position (class_id, position)
FKs: class_id → class(id), student_id → student(id)

5) course_enrollment
- Enrollment to a course, independent of specific sessions. Supports courses with zero sessions.

Columns
- id int PK AUTO_INCREMENT
- course_id int NOT NULL
- student_id int NOT NULL
- status enum('ACTIVE','CANCELLED','COMPLETED') NOT NULL DEFAULT 'ACTIVE'
- enrolled_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
- cancelled_at datetime(3) NULL
- created_at, updated_at datetime(3) NOT NULL, deleted_at datetime(3) NULL
Constraints: UNIQUE (course_id, student_id)
Indexes: IDX_course_enrollment_course, IDX_course_enrollment_student
FKs: course_id → course(id), student_id → student(id)

Integrity and concurrency
- Capacity: enforce bookings_count < capacity_max transactionally when inserting booking. Use SELECT ... FOR UPDATE on class row and COUNT(bookings) to prevent race.
- Teacher overlap: enforce in service layer by checking overlapping classes for teacher with SELECT ... FOR UPDATE (teacher_id, time window). Add composite index on (teacher_id, start_at) and filter by end_at.
- UTC: all datetime fields stored as UTC; input/output converted at API boundaries. Optionally store source_timezone for diagnostics.
- Soft delete: deleted_at used on all mutable tables. Application must filter by deleted_at IS NULL.

6) course_teacher (associate teachers to courses)
- Many-to-many join so a course can display one or more teachers.

Columns
- id int PK AUTO_INCREMENT
- course_id int NOT NULL
- teacher_id int NOT NULL
- role enum('LEAD','ASSISTANT') NOT NULL DEFAULT 'LEAD'
- created_at, updated_at datetime(3) NOT NULL, deleted_at datetime(3) NULL
Constraints: UNIQUE (course_id, teacher_id)
Indexes: IDX_course_teacher_course (course_id), IDX_course_teacher_teacher (teacher_id)
FKs: course_id → course(id), teacher_id → teacher(id)

## End-to-end flows

### PRIVATE class (student-initiated from availability)
1) Discover availability
	- Client lists teacher availability windows (teacher_availability) for a target day/time range.
2) Reserve slot (transaction)
	- Start transaction
	- Validate no overlapping class for teacher in [start_at, end_at)
	- Insert session: type='PRIVATE', visibility='PRIVATE', capacity_max = N (usually 1), created_from_availability_id set
	- Insert booking for each participant (status='CONFIRMED'); verify current COUNT(bookings) < capacity_max
	- Do not create BLACKOUT rows; future availability queries must subtract class intervals
	- Commit
3) Visibility
	- Class is hidden from public catalog; visible to teacher, admins, and allowed participants.
4) Cancellation (deferred policies)
	- On cancel, set booking.status='CANCELLED', booking.cancelled_at; if all seats cancel, optionally set class.status='CANCELLED' and remove blackout/restore availability window.

### PRIVATE class (teacher/admin-created)
1) Create class directly
	- Insert session with type='PRIVATE', visibility='PRIVATE', capacity_max set appropriately.
2) Invite/link students
	- Create booking rows with status='INVITED' for invited students; set invited_at.
	- On student acceptance, transition booking to status='CONFIRMED' and set accepted_at; enforce capacity at transition time.

### GROUP class (catalog class)
1) Create/publish
	- Admin/teacher inserts session with type='GROUP', visibility='PUBLIC', capacity_max > 1.
	- Appears in public catalog when status='SCHEDULED'.
2) Booking (transaction)
	- Start transaction
	- SELECT session FOR UPDATE; ensure status='SCHEDULED' and COUNT(bookings) < capacity_max
	- Insert booking (status='CONFIRMED')
	- Commit
	- If class becomes full, keep visible but mark as "Full" or hide based on business rule; waitlist can be added later.
3) Cancellation
	- Student cancels → booking.status='CANCELLED'; seat freed; optionally promote waitlist in v1.1.

### COURSE: enrollment-only (no sessions)
1) Create course
	- Insert course; no class rows needed initially.
2) Enroll student
	- Insert course_enrollment (status='ACTIVE').
3) Access
	- Enrollment grants future materials access and/or future session eligibility; no classes required.

### COURSE: with sessions

// It would be good in future to have multiple options of a single class. Let's say COURSE-1-CLASS-1 has 3 sessions Mon, Wed, Fri. A student can book 1 of these. Likewise COURSE-1-CLASS-2. This would give the student the option to have a more flexible schedule if the school scales to be able to offer this.
1) Create course and sessions
	- Insert course; then insert session rows with type='COURSE' and course_id set.
	- For sessions that require enrollment-only visibility, set requires_enrollment=1 and visibility='HIDDEN' or 'PRIVATE'.
2) Booking rules
	- If requires_enrollment=1 → only enrolled students may book; enforce via join check on course_enrollment.
	- If requires_enrollment=0 and visibility='PUBLIC' → anyone may book like GROUP.
3) Cancellation
	- Cancelling a session affects bookings for that class only; course_enrollment remains unless course-level cancellation is performed.

### Future: 1-of-N session options within a course
- Goal: Let a course module offer multiple alternative session options where a student books exactly one (or N-of-M) per requirement.
- Minimal design:
	- Add session_group table to represent a requirement bucket (e.g., "Week 1 speaking session").
	- Add session.session_group_id (nullable) to group alternative session rows that satisfy the same requirement.
	- Enforce at booking time: one active booking per (session_group_id, student_id) across the course. Use UNIQUE in app logic (MySQL lacks filtered indexes with deleted_at).
- Suggested fields:
	- session_group: id PK, course_id FK, name, requirement_kind enum('ONE_OF','N_OF','ALL_OF') default 'ONE_OF', requirement_count smallint (used when N_OF), created_at/updated_at/deleted_at.
- Flow:
	1) Admin creates a class_group per requirement and attaches multiple class rows to it.
	2) Students see grouped options; booking one option disables others for that student.
	3) Rescheduling can cancel prior booking and allow picking another within the same group (policy-controlled).

### Catalog visibility and gating (summary)
- PUBLIC: visible to everyone when status='SCHEDULED'.
- PRIVATE: hidden; only teacher/admins and class_allowed_participant students can access.
- HIDDEN: not in catalog; only accessible by direct link/role-based access.
- requires_enrollment precedence (type='COURSE'):
	- When requires_enrollment=1 → treat as hidden from the public catalog regardless of visibility; only enrolled students and staff can view/book.
	- For enrolled students, stored visibility still controls whether it appears in their enrolled catalog (PUBLIC vs HIDDEN).

### Transactional booking pseudocode
- SELECT ... FOR UPDATE session WHERE id=? AND deleted_at IS NULL
- IF status!='SCHEDULED' OR NOW()>end_at → reject
- SELECT COUNT(*) FROM booking WHERE session_id=? AND status IN ('CONFIRMED')
- IF count >= capacity_max → reject
- INSERT booking(...)
- COMMIT

### Optional teacher calendar locks (to prevent overlap races)
- Advisory lock approach: within the create-session transaction, call SELECT GET_LOCK(CONCAT('teacher:', teacher_id), timeout) before conflict checks; release at commit. Prevents parallel overlaps cheaply, but app-dependent and not visible in DB.
- Time-bucket lock table: create teacher_time_lock(teacher_id, bucket_start DATETIME, PRIMARY KEY(teacher_id, bucket_start)). For a session, compute 5-minute buckets from start to end and insert rows in the same transaction. Unique constraint ensures any overlap collides. Cleanup on cancel/delete.

Minimal DDL sketch (MySQL)
Note: final migrations will use TypeORM with @Column({ name: 'snake_case' }) for property mapping.

```sql
CREATE TABLE IF NOT EXISTS course (
	id int NOT NULL AUTO_INCREMENT,
	slug varchar(191) NOT NULL,
	title varchar(255) NOT NULL,
	description text NULL,
	is_active tinyint(1) NOT NULL DEFAULT 1,
	enrollment_opens_at datetime(3) NULL,
	enrollment_closes_at datetime(3) NULL,
	created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	deleted_at datetime(3) NULL,
	PRIMARY KEY (id),
	UNIQUE KEY IDX_course_slug_unique (slug),
	KEY IDX_course_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS session (
	id int NOT NULL AUTO_INCREMENT,
	type enum('PRIVATE','GROUP','COURSE') NOT NULL,
	course_id int NULL,
	teacher_id int NOT NULL,
	created_from_availability_id int NULL,
	start_at datetime(3) NOT NULL,
	end_at datetime(3) NOT NULL,
	capacity_max smallint unsigned NOT NULL DEFAULT 1,
	status enum('SCHEDULED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
	visibility enum('PUBLIC','PRIVATE','HIDDEN') NOT NULL DEFAULT 'PUBLIC',
	requires_enrollment tinyint(1) NOT NULL DEFAULT 0,
	meeting_url varchar(500) NULL,
	source_timezone varchar(64) NULL,
	created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	deleted_at datetime(3) NULL,
	PRIMARY KEY (id),
	KEY IDX_session_teacher_time (teacher_id, start_at),
	KEY IDX_session_course_time (course_id, start_at),
	KEY IDX_session_time (start_at),
	CONSTRAINT FK_session_teacher FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE RESTRICT,
	CONSTRAINT FK_session_course FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE SET NULL,
	CONSTRAINT FK_session_created_from_availability FOREIGN KEY (created_from_availability_id) REFERENCES teacher_availability(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS booking (
	id int NOT NULL AUTO_INCREMENT,
	session_id int NOT NULL,
	student_id int NOT NULL,
	status enum('INVITED','CONFIRMED','CANCELLED','NO_SHOW','FORFEIT') NOT NULL DEFAULT 'CONFIRMED',
	cancelled_at datetime(3) NULL,
	cancellation_reason varchar(500) NULL,
	invited_at datetime(3) NULL,
	accepted_at datetime(3) NULL,
	created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	deleted_at datetime(3) NULL,
	PRIMARY KEY (id),
	UNIQUE KEY UQ_booking_student_session (session_id, student_id),
	KEY IDX_booking_session (session_id),
	KEY IDX_booking_student (student_id),
	CONSTRAINT FK_booking_session FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE,
	CONSTRAINT FK_booking_student FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS course_enrollment (
	id int NOT NULL AUTO_INCREMENT,
	course_id int NOT NULL,
	student_id int NOT NULL,
	status enum('ACTIVE','CANCELLED','COMPLETED') NOT NULL DEFAULT 'ACTIVE',
	enrolled_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	cancelled_at datetime(3) NULL,
	created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	deleted_at datetime(3) NULL,
	PRIMARY KEY (id),
	UNIQUE KEY UQ_course_enrollment (course_id, student_id),
	KEY IDX_course_enrollment_course (course_id),
	KEY IDX_course_enrollment_student (student_id),
	CONSTRAINT FK_course_enrollment_course FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
	CONSTRAINT FK_course_enrollment_student FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE IF NOT EXISTS course_teacher (
	id int NOT NULL AUTO_INCREMENT,
	course_id int NOT NULL,
	teacher_id int NOT NULL,
	role enum('LEAD','ASSISTANT') NOT NULL DEFAULT 'LEAD',
	created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	deleted_at datetime(3) NULL,
	PRIMARY KEY (id),
	UNIQUE KEY UQ_course_teacher (course_id, teacher_id),
	KEY IDX_course_teacher_course (course_id),
	KEY IDX_course_teacher_teacher (teacher_id),
	CONSTRAINT FK_course_teacher_course FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
	CONSTRAINT FK_course_teacher_teacher FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

API implications (high level)
- Catalog: list/search classes and courses
- Scheduling: create/update class; optional link to a course
- Booking: create/cancel booking with capacity enforcement
- Course enrollment: enroll/cancel independent of sessions
- Course teachers: list teachers for a course via course_teacher join.

Future additions
- waitlist table
- cancellation_policy and cancellation_event tables
- package/credit ledger
- integration metadata tables (calendar sync, meeting providers)

Payments and credits (future-ready notes)
- Keep bookings/enrollments agnostic to payments. Use a double-entry-like ledger to represent value flow.
- Tables to add later:
	- package (definition) and package_item (what it grants: PRIVATE seat credit, GROUP seat credit, COURSE_ENROLLMENT)
	- package_allocation (per-student allocation with validity window, subject/tier constraints)
	- credit_transaction (student_id, kind 'GRANT'|'DEBIT'|'REFUND'|'FORFEIT', quantity, unit 'PRIVATE_SEAT'|'GROUP_SEAT'|'COURSE_ENROLLMENT', links to booking_id or course_enrollment_id, with optional payment_id)
	- payment (provider, provider_payment_id, amount, currency, status, metadata)
	- booking_payment and course_enrollment_payment (join tables linking payments to the corresponding records)
- Booking flow can then: reserve credit (DEBIT) or attach a one-off payment; refunds create compensating transactions (REFUND) without mutating history.
- Snapshot fields like price_amount and price_currency on booking/enrollment preserve historical pricing even if catalog changes later.

