# Group Classes Feature Plan

## Overview

Implement Group Classes - scheduled sessions with multiple students (usually one teacher), fixed scheduling set by admins, level-based organization (A1, A2, B1, etc.), waitlist support, and calendar integration for student booking.

## Key Characteristics

- **Capacity**: Arbitrary number of students (configurable max capacity)
- **Teachers**: Support multiple teachers (usually just one)
- **Scheduling**: Admin-only creation with fixed times (one-off or recurring via RRULE)
- **Levels**: Proficiency levels (A1, A2, B1, B2, C1, C2, etc.)
- **Waitlist**: Queue for students when class is full
- **Booking**: Students can book from calendar with filtering by level/type

## Relation to Existing Architecture

Group classes leverage the existing `Session` entity with `type = 'GROUP'` and `capacityMax > 1`. The current architecture already supports:
- Session types (PRIVATE, GROUP, COURSE) via [class-types.ts](nestjs/src/common/types/class-types.ts)
- Waitlist table via [waitlist.entity.ts](nestjs/src/waitlists/entities/waitlist.entity.ts)
- Booking multiple students per session via [booking.entity.ts](nestjs/src/payments/entities/booking.entity.ts)

**New additions needed:**
- Level taxonomy (A1-C2 proficiency levels)
- Group class metadata (recurring schedule, level assignment)
- Admin UI for creating/managing group classes
- Student calendar filtering and group class display
- Waitlist notifications (stub for future)

---

## Database Schema Changes

### 1. New Table: `level`

Stores proficiency levels for group classes.

```sql
CREATE TABLE level (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(10) NOT NULL UNIQUE COMMENT 'Level code like A1, A2, B1, B2, C1, C2',
  name VARCHAR(100) NOT NULL COMMENT 'Display name like "Beginner A1"',
  description TEXT NULL COMMENT 'Level description',
  sort_order INT NOT NULL DEFAULT 0 COMMENT 'Display ordering',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether level is currently active',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,

  INDEX idx_active (is_active),
  INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default levels
INSERT INTO level (code, name, description, sort_order) VALUES
  ('A1', 'Beginner A1', 'Can understand and use familiar everyday expressions', 10),
  ('A2', 'Elementary A2', 'Can communicate in simple and routine tasks', 20),
  ('B1', 'Intermediate B1', 'Can deal with most situations while traveling', 30),
  ('B2', 'Upper Intermediate B2', 'Can interact with a degree of fluency', 40),
  ('C1', 'Advanced C1', 'Can express ideas fluently and spontaneously', 50),
  ('C2', 'Proficiency C2', 'Can understand with ease virtually everything', 60);
```

### 2. New Table: `group_class`

Stores metadata for group class sessions (recurring patterns, level, etc.).

```sql
CREATE TABLE group_class (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT 'Class title like "Spanish Conversation B1"',
  description TEXT NULL COMMENT 'Class description',
  level_id INT NOT NULL COMMENT 'FK to level.id',
  capacity_max SMALLINT UNSIGNED NOT NULL DEFAULT 6 COMMENT 'Maximum students',

  -- Scheduling
  rrule VARCHAR(500) NULL COMMENT 'RFC5545 RRULE for recurring sessions',
  start_date DATE NULL COMMENT 'First occurrence date (for recurring)',
  end_date DATE NULL COMMENT 'Last occurrence date (for recurring)',

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether class is currently active',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,

  FOREIGN KEY (level_id) REFERENCES level(id) ON DELETE RESTRICT,
  INDEX idx_level (level_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. New Table: `group_class_teacher`

Many-to-many mapping between group classes and teachers (supports multiple teachers).

```sql
CREATE TABLE group_class_teacher (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_class_id INT NOT NULL COMMENT 'FK to group_class.id',
  teacher_id INT NOT NULL COMMENT 'FK to teacher.id',
  is_primary BOOLEAN DEFAULT FALSE COMMENT 'Primary teacher for the class',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,

  FOREIGN KEY (group_class_id) REFERENCES group_class(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_group_teacher (group_class_id, teacher_id),
  INDEX idx_group (group_class_id),
  INDEX idx_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. Extend Table: `session`

Add reference to group_class for GROUP type sessions.

```sql
ALTER TABLE session
  ADD COLUMN group_class_id INT NULL COMMENT 'FK to group_class.id (for GROUP sessions)',
  ADD CONSTRAINT fk_session_group_class
    FOREIGN KEY (group_class_id) REFERENCES group_class(id) ON DELETE SET NULL,
  ADD INDEX idx_group_class (group_class_id);
```

### 5. Extend Table: `waitlist`

Add notification tracking for waitlist (stub for future notifications).

```sql
ALTER TABLE waitlist
  ADD COLUMN notified_at DATETIME(3) NULL COMMENT 'When student was notified of opening',
  ADD COLUMN notification_expires_at DATETIME(3) NULL COMMENT 'When notification expires',
  ADD INDEX idx_notified (notified_at);
```

---

## TypeORM Entities

### New Entity: `Level`

**File**: `nestjs/src/levels/entities/level.entity.ts`

```typescript
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('level')
@Index(['isActive'])
@Index(['sortOrder'])
export class Level extends BaseEntity {
  @Column({
    name: 'code',
    type: 'varchar',
    length: 10,
    unique: true,
    comment: 'Level code like A1, A2, B1',
  })
  code: string;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 100,
    comment: 'Display name',
  })
  name: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Level description',
  })
  description: string | null;

  @Column({
    name: 'sort_order',
    type: 'int',
    default: 0,
    comment: 'Display ordering',
  })
  sortOrder: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
    comment: 'Whether level is active',
  })
  isActive: boolean;
}
```

### New Entity: `GroupClass`

**File**: `nestjs/src/group-classes/entities/group-class.entity.ts`

```typescript
import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { Level } from '../../levels/entities/level.entity.js';
import type { GroupClassTeacher } from './group-class-teacher.entity.js';
import type { Session } from '../../sessions/entities/session.entity.js';

@Entity('group_class')
@Index(['levelId'])
@Index(['isActive'])
export class GroupClass extends BaseEntity {
  @Column({
    name: 'title',
    type: 'varchar',
    length: 255,
    comment: 'Class title',
  })
  title: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Class description',
  })
  description: string | null;

  @Column({
    name: 'level_id',
    type: 'int',
    comment: 'FK to level.id',
  })
  levelId: number;

  @ManyToOne(() => Level, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'level_id' })
  level: Level;

  @Column({
    name: 'capacity_max',
    type: 'smallint',
    unsigned: true,
    default: 6,
    comment: 'Maximum students',
  })
  capacityMax: number;

  @Column({
    name: 'rrule',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'RFC5545 RRULE for recurring',
  })
  rrule: string | null;

  @Column({
    name: 'start_date',
    type: 'date',
    nullable: true,
    comment: 'First occurrence date',
  })
  startDate: Date | null;

  @Column({
    name: 'end_date',
    type: 'date',
    nullable: true,
    comment: 'Last occurrence date',
  })
  endDate: Date | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
    comment: 'Whether class is active',
  })
  isActive: boolean;

  @OneToMany('GroupClassTeacher', 'groupClass')
  groupClassTeachers: GroupClassTeacher[];

  @OneToMany('Session', 'groupClass')
  sessions: Session[];
}
```

### New Entity: `GroupClassTeacher`

**File**: `nestjs/src/group-classes/entities/group-class-teacher.entity.ts`

```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { GroupClass } from './group-class.entity.js';
import { Teacher } from '../../teachers/entities/teacher.entity.js';

@Entity('group_class_teacher')
@Unique(['groupClassId', 'teacherId'])
@Index(['groupClassId'])
@Index(['teacherId'])
export class GroupClassTeacher extends BaseEntity {
  @Column({
    name: 'group_class_id',
    type: 'int',
    comment: 'FK to group_class.id',
  })
  groupClassId: number;

  @ManyToOne(() => GroupClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_class_id' })
  groupClass: GroupClass;

  @Column({
    name: 'teacher_id',
    type: 'int',
    comment: 'FK to teacher.id',
  })
  teacherId: number;

  @ManyToOne(() => Teacher, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({
    name: 'is_primary',
    type: 'boolean',
    default: false,
    comment: 'Primary teacher',
  })
  isPrimary: boolean;
}
```

### Update Entity: `Session`

**File**: `nestjs/src/sessions/entities/session.entity.ts`

Add:

```typescript
@Column({
  name: 'group_class_id',
  type: 'int',
  nullable: true,
  comment: 'FK to group_class.id (for GROUP sessions)',
})
groupClassId: number | null;

@ManyToOne(() => GroupClass, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'group_class_id' })
groupClass: GroupClass | null;
```

### Update Entity: `Waitlist`

**File**: `nestjs/src/waitlists/entities/waitlist.entity.ts`

Add:

```typescript
@Column({
  name: 'notified_at',
  type: 'datetime',
  precision: 3,
  nullable: true,
  comment: 'When student was notified',
})
notifiedAt: Date | null;

@Column({
  name: 'notification_expires_at',
  type: 'datetime',
  precision: 3,
  nullable: true,
  comment: 'When notification expires',
})
notificationExpiresAt: Date | null;
```

---

## Backend API (NestJS)

### Module Structure

```
nestjs/src/
├── levels/
│   ├── levels.module.ts
│   ├── levels.controller.ts
│   ├── levels.service.ts
│   ├── entities/
│   │   └── level.entity.ts
│   └── dto/
│       ├── create-level.dto.ts
│       └── update-level.dto.ts
├── group-classes/
│   ├── group-classes.module.ts
│   ├── group-classes.controller.ts
│   ├── group-classes.service.ts
│   ├── entities/
│   │   ├── group-class.entity.ts
│   │   └── group-class-teacher.entity.ts
│   └── dto/
│       ├── create-group-class.dto.ts
│       ├── update-group-class.dto.ts
│       └── group-class-response.dto.ts
└── waitlists/
    ├── waitlists.module.ts (already exists)
    ├── waitlists.controller.ts
    ├── waitlists.service.ts
    └── dto/
        └── notify-waitlist.dto.ts (new)
```

### API Endpoints

#### Levels (Admin Only)

```typescript
// GET /api/levels
// List all levels (public read, for filtering)
{
  levels: [
    { id: 1, code: 'A1', name: 'Beginner A1', description: '...', sortOrder: 10, isActive: true }
  ]
}

// POST /api/levels (Admin only)
// Create new level
{
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

// PATCH /api/levels/:id (Admin only)
// Update level
{
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// DELETE /api/levels/:id (Admin only)
// Soft delete level (only if no group classes use it)
```

#### Group Classes (Admin CRUD)

```typescript
// GET /api/group-classes
// List group classes with filters
// Query params: levelId?, isActive?, page?, limit?
{
  groupClasses: [
    {
      id: number;
      title: string;
      description: string | null;
      level: { id: number; code: string; name: string };
      capacityMax: number;
      rrule: string | null;
      startDate: string | null; // ISO date
      endDate: string | null;
      teachers: [
        { teacherId: number; name: string; isPrimary: boolean }
      ];
      isActive: boolean;
      upcomingSessionsCount: number; // computed
    }
  ],
  total: number;
  page: number;
  limit: number;
}

// GET /api/group-classes/:id
// Get single group class with full details
{
  id: number;
  title: string;
  description: string | null;
  level: { id: number; code: string; name: string };
  capacityMax: number;
  rrule: string | null;
  startDate: string | null;
  endDate: string | null;
  teachers: [
    { teacherId: number; userId: number; name: string; isPrimary: boolean }
  ];
  sessions: [
    {
      id: number;
      startAt: string;
      endAt: string;
      enrolledCount: number;
      status: string;
    }
  ];
  isActive: boolean;
}

// POST /api/group-classes (Admin only)
// Create new group class
{
  title: string;
  description?: string;
  levelId: number;
  capacityMax: number;
  teacherIds: number[]; // Array of teacher IDs
  primaryTeacherId: number; // Which teacher is primary

  // For one-off sessions
  sessions?: [
    { startAt: string; endAt: string; meetingUrl?: string; }
  ];

  // OR for recurring
  rrule?: string; // e.g., "FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20251231T235959Z"
  startDate?: string; // ISO date
  endDate?: string;
  sessionStartTime?: string; // Time like "14:00"
  sessionDuration?: number; // Minutes
}

// PATCH /api/group-classes/:id (Admin only)
// Update group class metadata
{
  title?: string;
  description?: string;
  levelId?: number;
  capacityMax?: number;
  teacherIds?: number[];
  primaryTeacherId?: number;
  rrule?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

// DELETE /api/group-classes/:id (Admin only)
// Soft delete group class (cascades to future sessions)

// POST /api/group-classes/:id/generate-sessions (Admin only)
// Generate/regenerate sessions from RRULE
// (Called after editing recurring schedule)
{
  fromDate?: string; // Start generating from this date (default: today)
  untilDate?: string; // Generate until this date (default: endDate)
}
```

#### Student Booking & Waitlist

```typescript
// GET /api/group-classes/available
// List available group class sessions for booking (Student view)
// Query params: levelId?, startDate?, endDate?, teacherId?
{
  sessions: [
    {
      sessionId: number;
      groupClass: {
        id: number;
        title: string;
        level: { code: string; name: string };
      };
      startAt: string;
      endAt: string;
      teacher: { id: number; name: string };
      capacityMax: number;
      enrolledCount: number;
      availableSpots: number;
      isFull: boolean;
      canJoinWaitlist: boolean;
      meetingUrl: string | null; // Only shown if student is booked
    }
  ]
}

// POST /api/bookings (Student)
// Book a group class session (same as existing private booking)
{
  sessionId: number;
  studentPackageId?: number; // Use package credit
  paymentIntentId?: string; // Or pay directly
}
// Response:
{
  bookingId: number;
  status: 'CONFIRMED' | 'PENDING';
  creditUsed: boolean;
}

// POST /api/waitlists (Student)
// Join waitlist for full session
{
  sessionId: number;
}
// Response:
{
  waitlistId: number;
  position: number;
  sessionId: number;
}

// DELETE /api/waitlists/:id (Student)
// Leave waitlist

// GET /api/waitlists/me (Student)
// Get my waitlist entries
{
  waitlists: [
    {
      id: number;
      position: number;
      session: {
        id: number;
        startAt: string;
        endAt: string;
        groupClass: { title: string; level: { code: string } };
      };
      notifiedAt: string | null;
    }
  ]
}
```

#### Waitlist Management (Admin)

```typescript
// GET /api/waitlists/session/:sessionId (Admin)
// Get waitlist for a specific session
{
  sessionId: number;
  waitlists: [
    {
      id: number;
      position: number;
      student: { id: number; name: string; email: string };
      createdAt: string;
      notifiedAt: string | null;
    }
  ]
}

// POST /api/waitlists/:id/notify (Admin)
// Send notification to waitlist member (stub for future)
{
  expiresInHours?: number; // Default 24
}

// POST /api/waitlists/:id/promote (Admin)
// Manually promote waitlist member to booking
{
  studentPackageId?: number; // If using package credit
}
```

---

## Admin UI (Thrive Admin Plugin - Vue)

### New Page: Group Classes

**File**: `wordpress/plugins/thrive-admin/src/components/GroupClasses.vue`

**Features**:
- List view with filters (level, teacher, active/inactive)
- Create new group class modal
- Edit group class modal
- View sessions for a group class
- Generate sessions from RRULE
- Assign/reassign teachers
- View waitlists per session
- Manage session capacity

**UI Structure**:

```vue
<template>
  <div class="group-classes-admin">
    <!-- Header with Create Button -->
    <div class="flex justify-between items-center mb-6">
      <h2>Group Classes</h2>
      <button @click="showCreateModal = true" class="wp-admin-button-primary">
        Create Group Class
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-bar mb-4">
      <select v-model="filters.levelId">
        <option value="">All Levels</option>
        <option v-for="level in levels" :key="level.id" :value="level.id">
          {{ level.code }} - {{ level.name }}
        </option>
      </select>

      <select v-model="filters.teacherId">
        <option value="">All Teachers</option>
        <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
          {{ teacher.name }}
        </option>
      </select>

      <label>
        <input type="checkbox" v-model="filters.activeOnly">
        Active only
      </label>
    </div>

    <!-- Group Classes Table -->
    <table class="wp-admin-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Level</th>
          <th>Teachers</th>
          <th>Capacity</th>
          <th>Schedule</th>
          <th>Upcoming Sessions</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="gc in groupClasses" :key="gc.id">
          <td>{{ gc.title }}</td>
          <td>{{ gc.level.code }}</td>
          <td>
            <span v-for="t in gc.teachers" :key="t.teacherId">
              {{ t.name }}{{ t.isPrimary ? ' (Primary)' : '' }}
            </span>
          </td>
          <td>{{ gc.capacityMax }}</td>
          <td>{{ formatSchedule(gc) }}</td>
          <td>{{ gc.upcomingSessionsCount }}</td>
          <td>
            <span :class="gc.isActive ? 'badge-active' : 'badge-inactive'">
              {{ gc.isActive ? 'Active' : 'Inactive' }}
            </span>
          </td>
          <td>
            <button @click="editGroupClass(gc)">Edit</button>
            <button @click="viewSessions(gc)">Sessions</button>
            <button @click="toggleActive(gc)">
              {{ gc.isActive ? 'Deactivate' : 'Activate' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Create/Edit Modal -->
    <GroupClassModal
      v-if="showCreateModal || showEditModal"
      :groupClass="selectedGroupClass"
      :levels="levels"
      :teachers="teachers"
      @close="closeModal"
      @save="saveGroupClass"
    />

    <!-- Sessions View Modal -->
    <GroupClassSessionsModal
      v-if="showSessionsModal"
      :groupClass="selectedGroupClass"
      @close="showSessionsModal = false"
    />
  </div>
</template>
```

### New Component: GroupClassModal.vue

**File**: `wordpress/plugins/thrive-admin/src/components/GroupClassModal.vue`

**Features**:
- Form for creating/editing group class
- Level dropdown
- Teacher multi-select with primary designation
- Capacity input
- Schedule type selector (one-off vs recurring)
- RRULE builder (simple UI for weekly recurring)
- One-off session date/time pickers

**Form Fields**:
- Title (text)
- Description (textarea)
- Level (dropdown)
- Capacity (number)
- Teachers (multi-select checkboxes with primary radio)
- Schedule Type (radio: "One-off Sessions" / "Recurring")
- If One-off:
  - Add Session button → date/time picker rows
- If Recurring:
  - Days of week (checkboxes: Mon, Tue, Wed...)
  - Start time (time input)
  - Duration (minutes)
  - Start date (date)
  - End date (date)

### New Component: GroupClassSessionsModal.vue

**Features**:
- List all sessions for the group class
- Show enrollment count per session
- View waitlist per session
- Cancel individual sessions
- Generate sessions button (if recurring)

### Navigation Addition

Update `wordpress/plugins/thrive-admin/src/App.vue` to add "Group Classes" to navigation:

```vue
<nav>
  <a @click="currentPage = 'dashboard'">Dashboard</a>
  <a @click="currentPage = 'users'">Users</a>
  <a @click="currentPage = 'packages'">Packages</a>
  <a @click="currentPage = 'group-classes'">Group Classes</a> <!-- NEW -->
  <a @click="currentPage = 'settings'">Settings</a>
</nav>
```

---

## Student-Facing UI (WordPress Theme)

### 1. Extend Calendar Block to Show Group Classes

**File**: `wordpress/themes/custom-theme/blocks/student-calendar/components/StudentCalendar.tsx`

**Changes**:
- Fetch group class sessions in addition to teacher availability
- Display group sessions as events on calendar
- Show capacity/enrollment info on event hover
- Click event to open booking modal

**Updated Event Fetching**:

```typescript
// Add to existing calendar data fetch
const fetchCalendarData = async (start: Date, end: Date) => {
  const [availabilityRes, groupSessionsRes, bookingsRes] = await Promise.all([
    // Existing availability fetch
    fetch(`/api/teachers/${teacherId}/availability/preview?start=${start.toISOString()}&end=${end.toISOString()}`),

    // NEW: Fetch available group sessions
    fetch(`/api/group-classes/available?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),

    // Existing bookings fetch
    fetch(`/api/bookings/student/me?start=${start.toISOString()}&end=${end.toISOString()}`)
  ]);

  const availability = await availabilityRes.json();
  const groupSessions = await groupSessionsRes.json();
  const bookings = await bookingsRes.json();

  // Merge events
  const events = [
    ...mapAvailabilityToEvents(availability),
    ...mapGroupSessionsToEvents(groupSessions.sessions),
    ...mapBookingsToEvents(bookings.bookings)
  ];

  return events;
};

function mapGroupSessionsToEvents(sessions) {
  return sessions.map(s => ({
    id: `group-session-${s.sessionId}`,
    type: 'class',
    serviceType: 'GROUP',
    title: s.groupClass.title,
    startUtc: s.startAt,
    endUtc: s.endAt,
    sessionId: s.sessionId,
    groupClassId: s.groupClass.id,
    level: s.groupClass.level,
    teacher: s.teacher,
    capacityMax: s.capacityMax,
    enrolledCount: s.enrolledCount,
    availableSpots: s.availableSpots,
    isFull: s.isFull,
    canJoinWaitlist: s.canJoinWaitlist
  }));
}
```

### 2. Add Filtering UI

**Component**: New filter toolbar above calendar

**File**: `wordpress/themes/custom-theme/blocks/student-calendar/components/CalendarFilters.tsx`

```tsx
interface CalendarFiltersProps {
  levels: Level[];
  selectedLevels: number[];
  onLevelsChange: (levels: number[]) => void;
  showPrivate: boolean;
  showGroup: boolean;
  onShowPrivateChange: (show: boolean) => void;
  onShowGroupChange: (show: boolean) => void;
}

export function CalendarFilters(props: CalendarFiltersProps) {
  return (
    <div className="calendar-filters">
      <div className="filter-section">
        <h4>Class Type</h4>
        <label>
          <input
            type="checkbox"
            checked={props.showPrivate}
            onChange={e => props.onShowPrivateChange(e.target.checked)}
          />
          Private Sessions
        </label>
        <label>
          <input
            type="checkbox"
            checked={props.showGroup}
            onChange={e => props.onShowGroupChange(e.target.checked)}
          />
          Group Classes
        </label>
      </div>

      <div className="filter-section">
        <h4>Level</h4>
        {props.levels.map(level => (
          <label key={level.id}>
            <input
              type="checkbox"
              checked={props.selectedLevels.includes(level.id)}
              onChange={e => {
                const newLevels = e.target.checked
                  ? [...props.selectedLevels, level.id]
                  : props.selectedLevels.filter(l => l !== level.id);
                props.onLevelsChange(newLevels);
              }}
            />
            {level.code} - {level.name}
          </label>
        ))}
      </div>
    </div>
  );
}
```

### 3. Booking Modal Enhancement

**File**: Update existing modal to handle group sessions

When clicking a group session event:

```tsx
function handleGroupSessionClick(event: ClassEvent) {
  if (event.isFull) {
    // Show waitlist option
    showWaitlistModal({
      sessionId: event.sessionId,
      title: event.title,
      startAt: event.startUtc,
      level: event.level
    });
  } else {
    // Show booking modal
    showBookingModal({
      sessionId: event.sessionId,
      title: event.title,
      startAt: event.startUtc,
      endAt: event.endUtc,
      serviceType: 'GROUP',
      teacher: event.teacher,
      level: event.level,
      availableSpots: event.availableSpots
    });
  }
}
```

**New Modal**: WaitlistModal.tsx

```tsx
function WaitlistModal({ session, onClose, onJoin }) {
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    setJoining(true);
    try {
      const response = await fetch('/api/waitlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId })
      });
      const result = await response.json();
      alert(`You've been added to the waitlist at position ${result.position}`);
      onJoin();
      onClose();
    } catch (error) {
      alert('Failed to join waitlist');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="modal">
      <h3>Class is Full</h3>
      <p><strong>{session.title}</strong></p>
      <p>{new Date(session.startAt).toLocaleString()}</p>
      <p>Level: {session.level.code}</p>

      <p>This class is currently at capacity. Would you like to join the waitlist?</p>

      <div className="modal-actions">
        <button onClick={handleJoin} disabled={joining}>
          {joining ? 'Joining...' : 'Join Waitlist'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
```

### 4. Student Dashboard: My Waitlists

**New Block**: `student-waitlists`

**File**: `wordpress/themes/custom-theme/blocks/student-waitlists/`

Shows list of waitlist entries with:
- Class name and level
- Session date/time
- Current position
- Notification status
- "Leave Waitlist" button

---

## Business Logic & Validation

### GroupClassesService

**File**: `nestjs/src/group-classes/group-classes.service.ts`

**Key Methods**:

```typescript
class GroupClassesService {
  async createGroupClass(dto: CreateGroupClassDto, adminId: number): Promise<GroupClass> {
    // Validate level exists
    // Validate teachers exist
    // Create group_class record
    // Create group_class_teacher records
    // If one-off sessions: create session records
    // If recurring: store RRULE, generate initial sessions
    // Return created group class with relations
  }

  async updateGroupClass(id: number, dto: UpdateGroupClassDto, adminId: number): Promise<GroupClass> {
    // Update group_class record
    // If teachers changed: update group_class_teacher
    // If schedule changed: regenerate sessions (future only)
    // Return updated group class
  }

  async generateSessions(groupClassId: number, fromDate?: Date, untilDate?: Date): Promise<Session[]> {
    // Load group class with RRULE
    // Parse RRULE using rrule library
    // Generate session occurrences
    // For each occurrence:
    //   - Check if session already exists (by date/time)
    //   - If not, create session with type=GROUP, groupClassId, teacherId, etc.
    // Return created sessions
  }

  async getAvailableSessions(
    filters: { levelId?: number; teacherId?: number; startDate?: Date; endDate?: Date }
  ): Promise<SessionWithEnrollment[]> {
    // Query sessions where:
    //   - type = GROUP
    //   - startAt >= startDate
    //   - startAt <= endDate
    //   - status = SCHEDULED
    //   - groupClass.isActive = true
    //   - groupClass.levelId = levelId (if provided)
    //   - teacherId matches (if provided)
    // Join bookings to count enrolledCount
    // Calculate availableSpots = capacityMax - enrolledCount
    // Return sessions with enrollment data
  }
}
```

### WaitlistsService

**File**: `nestjs/src/waitlists/waitlists.service.ts`

**Key Methods**:

```typescript
class WaitlistsService {
  async joinWaitlist(sessionId: number, studentId: number): Promise<Waitlist> {
    // Check session is full
    // Check student not already on waitlist
    // Get next position (max(position) + 1)
    // Create waitlist entry
    // Return waitlist entry
  }

  async leaveWaitlist(waitlistId: number, studentId: number): Promise<void> {
    // Verify waitlist belongs to student
    // Delete waitlist entry
    // Reorder positions for remaining entries
  }

  async notifyWaitlistMember(waitlistId: number, expiresInHours: number = 24): Promise<void> {
    // Mark notifiedAt = now
    // Set notificationExpiresAt = now + expiresInHours
    // TODO: Send email notification (stub for now)
    // Log notification
  }

  async promoteToBooking(waitlistId: number, adminId: number, studentPackageId?: number): Promise<Booking> {
    // Load waitlist entry
    // Check session has available spot
    // Create booking (CONFIRMED status)
    // Delete waitlist entry
    // Reorder remaining waitlist positions
    // Return booking
  }

  async handleBookingCancellation(sessionId: number): Promise<void> {
    // Check if session has waitlist
    // If yes and session has available spots:
    //   - Get first waitlist member
    //   - Call notifyWaitlistMember()
  }
}
```

### Booking Cancellation Integration

When a student cancels a GROUP session booking:

1. Cancel booking (existing logic)
2. Call `waitlistsService.handleBookingCancellation(sessionId)`
3. First waitlist member gets notified (stub email for now)

---

## RRULE Handling

Use `rrule` npm package for parsing and generating recurring sessions.

**Example RRULE patterns**:

```
Weekly on Tuesdays and Thursdays for 12 weeks:
FREQ=WEEKLY;BYDAY=TU,TH;COUNT=24

Weekly on Mondays until end of year:
FREQ=WEEKLY;BYDAY=MO;UNTIL=20251231T235959Z
```

**Generation logic**:

```typescript
import { RRule } from 'rrule';

function generateSessionsFromRRule(
  rruleString: string,
  startTime: string, // e.g., "14:00"
  duration: number, // minutes
  timezone: string = 'UTC'
): Date[] {
  const rule = RRule.fromString(rruleString);
  const occurrences = rule.all(); // Array of Date objects

  return occurrences.map(date => {
    // Combine date with startTime
    const [hours, minutes] = startTime.split(':').map(Number);
    const sessionStart = new Date(date);
    sessionStart.setUTCHours(hours, minutes, 0, 0);
    return sessionStart;
  });
}
```

---

## Testing Strategy

### Backend Tests

1. **Unit Tests** (`*.spec.ts`):
   - LevelsService CRUD
   - GroupClassesService.generateSessions() with various RRULEs
   - WaitlistsService.joinWaitlist() position calculation
   - WaitlistsService.promoteToBooking() atomicity

2. **Integration Tests** (`*.e2e-spec.ts`):
   - Create group class → verify sessions generated
   - Book group session → verify booking + capacity decrement
   - Join waitlist when full → verify position
   - Cancel booking → verify waitlist notification triggered

### Frontend Tests

1. **Component Tests** (Vitest + Testing Library):
   - GroupClassModal form validation
   - CalendarFilters level selection
   - WaitlistModal join flow

2. **E2E Tests** (Playwright):
   - Admin creates recurring group class
   - Student filters calendar by level
   - Student books group session
   - Student joins waitlist for full class

---

## Migration Plan

### Migration File

**File**: `nestjs/src/migrations/1759000000003-AddGroupClassesTables.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupClassesTables1759000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create level table
    await queryRunner.query(`
      CREATE TABLE level (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        INDEX idx_active (is_active),
        INDEX idx_sort (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed levels
    await queryRunner.query(`
      INSERT INTO level (code, name, description, sort_order) VALUES
        ('A1', 'Beginner A1', 'Can understand and use familiar everyday expressions', 10),
        ('A2', 'Elementary A2', 'Can communicate in simple and routine tasks', 20),
        ('B1', 'Intermediate B1', 'Can deal with most situations while traveling', 30),
        ('B2', 'Upper Intermediate B2', 'Can interact with a degree of fluency', 40),
        ('C1', 'Advanced C1', 'Can express ideas fluently and spontaneously', 50),
        ('C2', 'Proficiency C2', 'Can understand with ease virtually everything', 60)
    `);

    // Create group_class table
    await queryRunner.query(`
      CREATE TABLE group_class (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        level_id INT NOT NULL,
        capacity_max SMALLINT UNSIGNED NOT NULL DEFAULT 6,
        rrule VARCHAR(500) NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (level_id) REFERENCES level(id) ON DELETE RESTRICT,
        INDEX idx_level (level_id),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create group_class_teacher table
    await queryRunner.query(`
      CREATE TABLE group_class_teacher (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_class_id INT NOT NULL,
        teacher_id INT NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        deleted_at DATETIME(3) NULL,
        FOREIGN KEY (group_class_id) REFERENCES group_class(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON DELETE RESTRICT,
        UNIQUE KEY unique_group_teacher (group_class_id, teacher_id),
        INDEX idx_group (group_class_id),
        INDEX idx_teacher (teacher_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Extend session table
    await queryRunner.query(`
      ALTER TABLE session
        ADD COLUMN group_class_id INT NULL,
        ADD CONSTRAINT fk_session_group_class
          FOREIGN KEY (group_class_id) REFERENCES group_class(id) ON DELETE SET NULL,
        ADD INDEX idx_group_class (group_class_id)
    `);

    // Extend waitlist table
    await queryRunner.query(`
      ALTER TABLE waitlist
        ADD COLUMN notified_at DATETIME(3) NULL,
        ADD COLUMN notification_expires_at DATETIME(3) NULL,
        ADD INDEX idx_notified (notified_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE waitlist DROP COLUMN notified_at, DROP COLUMN notification_expires_at`);
    await queryRunner.query(`ALTER TABLE session DROP FOREIGN KEY fk_session_group_class`);
    await queryRunner.query(`ALTER TABLE session DROP COLUMN group_class_id`);
    await queryRunner.query(`DROP TABLE group_class_teacher`);
    await queryRunner.query(`DROP TABLE group_class`);
    await queryRunner.query(`DROP TABLE level`);
  }
}
```

---

## Implementation Phases

### Phase 1: Backend Foundation (Week 1)

**Tasks**:
1. Create migration for levels, group_class, group_class_teacher tables
2. Create Level entity, module, service, controller
3. Create GroupClass and GroupClassTeacher entities
4. Create GroupClassesModule with basic CRUD
5. Extend Session entity with groupClassId
6. Write unit tests for RRULE session generation
7. Seed default levels

**Deliverables**:
- Migration runs successfully
- API endpoints for levels CRUD (admin only)
- API endpoints for group classes CRUD (admin only)
- Unit tests pass

### Phase 2: Session Generation & Booking (Week 2)

**Tasks**:
1. Implement generateSessions() with RRULE parsing
2. Create endpoint POST /group-classes/:id/generate-sessions
3. Implement getAvailableSessions() with enrollment counting
4. Create endpoint GET /group-classes/available (student view)
5. Extend booking flow to support GROUP sessions
6. Write integration tests for booking group sessions

**Deliverables**:
- Admins can generate sessions from RRULE
- Students can see available group sessions
- Students can book group sessions
- Booking respects capacity limits

### Phase 3: Waitlist (Week 3)

**Tasks**:
1. Extend Waitlist entity with notification fields
2. Implement WaitlistsService methods
3. Create waitlist endpoints (join, leave, list)
4. Integrate waitlist notification on booking cancellation
5. Create admin endpoints for waitlist management
6. Write tests for waitlist flows

**Deliverables**:
- Students can join/leave waitlists
- Cancellation triggers waitlist notification (logged, email stub)
- Admins can view and manage waitlists

### Phase 4: Admin UI (Week 4)

**Tasks**:
1. Create GroupClasses.vue page component
2. Create GroupClassModal.vue form
3. Create GroupClassSessionsModal.vue
4. Add navigation link in App.vue
5. Implement level management UI (optional settings page)
6. Test admin workflows end-to-end

**Deliverables**:
- Admin can create/edit group classes
- Admin can view sessions and waitlists
- Admin can reassign teachers
- Admin can activate/deactivate classes

### Phase 5: Student UI (Week 5)

**Tasks**:
1. Extend StudentCalendar to fetch and display group sessions
2. Create CalendarFilters.tsx component
3. Create WaitlistModal.tsx component
4. Update booking modal to handle group sessions
5. Create StudentWaitlists block for dashboard
6. Style group session events differently on calendar

**Deliverables**:
- Students see group sessions on calendar
- Students can filter by level and type
- Students can book or join waitlist
- Students see their waitlist entries

### Phase 6: Polish & Testing (Week 6)

**Tasks**:
1. Write E2E tests (Playwright)
2. Add loading states and error handling
3. Improve UX (tooltips, help text, confirmations)
4. Add accessibility improvements (ARIA labels)
5. Performance optimization (query indexes, caching)
6. Documentation updates

**Deliverables**:
- All tests pass
- Production-ready UX
- Documentation updated in CLAUDE.md and docs/

---

## Documentation Updates

### Update CLAUDE.md

Add section:

```markdown
## Group Classes

Group classes are scheduled sessions with multiple students, organized by proficiency level (A1-C2). Only admins can create and manage group classes.

**Key Entities**:
- `level`: Proficiency levels (A1, A2, B1, B2, C1, C2)
- `group_class`: Group class metadata (title, level, capacity, schedule)
- `group_class_teacher`: Many-to-many teacher assignments
- `session`: Sessions with type=GROUP and groupClassId set

**Admin Capabilities**:
- Create group classes with one-off or recurring schedules (RRULE)
- Assign/reassign teachers
- Set capacity and level
- View enrollments and waitlists
- Generate sessions from recurring patterns

**Student Capabilities**:
- View available group sessions on calendar
- Filter by level and class type
- Book group sessions (respects capacity)
- Join waitlists when full
- View waitlist position and status

**Waitlist Behavior**:
- When a booking is cancelled, first waitlist member is notified
- Notification includes expiration window (default 24 hours)
- Admins can manually promote waitlist members

**API Endpoints**:
- `GET /api/levels` - List levels
- `GET /api/group-classes` - List group classes (admin)
- `POST /api/group-classes` - Create group class (admin)
- `GET /api/group-classes/available` - Available sessions (student)
- `POST /api/waitlists` - Join waitlist (student)
```

### Create New Doc

**File**: `docs/group-classes-architecture.md`

Detailed architecture document covering:
- Entity relationships diagram
- RRULE patterns and examples
- Waitlist notification flow
- Capacity management logic
- Calendar integration details
- Future enhancements (notifications, student levels, prerequisites)

---

## Open Questions & Future Enhancements

### Immediate Decisions Needed

1. **Session Editing**: Can admins edit individual generated sessions (e.g., change meeting URL, cancel one occurrence)?
   - **Recommendation**: Yes, allow editing individual sessions. Store as exception to RRULE.

2. **Pricing**: How are group classes priced?
   - Same as private sessions (1 credit per session)?
   - Different credit cost (e.g., 0.5 credits)?
   - Fixed price per session?
   - **Recommendation**: Allow configurable credit cost per group class (default 1).

3. **Overbooking**: Allow admins to overbook (add students beyond capacity)?
   - **Recommendation**: Yes, with warning. Some classes may accommodate extra students.

### Future Enhancements

1. **Student Levels**: Track student proficiency level to auto-filter classes
2. **Prerequisites**: Require completion of lower levels before booking higher levels
3. **Email Notifications**: Implement actual email sending for waitlist notifications
4. **SMS Notifications**: Optional SMS for waitlist promotions
5. **Attendance Tracking**: Mark students present/absent in group sessions
6. **Class Materials**: Upload/attach materials to group classes
7. **Discussion Forums**: Per-class discussion threads
8. **Recurring Enrollment**: Enroll in all sessions of a recurring class at once
9. **Payment Plans**: Allow payment plans for multi-session group classes
10. **Class Cancellation Policy**: Minimum enrollment to run (auto-cancel if under threshold)

---

## Summary

This plan implements Group Classes as a comprehensive feature that:

1. **Leverages existing architecture** (Session, Booking, Waitlist entities)
2. **Adds new entities** for levels and group class metadata
3. **Supports flexible scheduling** (one-off and recurring via RRULE)
4. **Provides admin control** over class creation, teacher assignment, and scheduling
5. **Enables student discovery** via calendar with filtering
6. **Manages capacity** with waitlists and notifications
7. **Integrates seamlessly** with existing booking and payment flows

**Estimated Timeline**: 6 weeks (1 developer)

**Risk Areas**:
- RRULE complexity (mitigate with thorough testing and rrule library)
- Calendar performance with many events (mitigate with pagination and smart caching)
- Waitlist notification delays (acceptable for v1, improve with background jobs later)

**Success Criteria**:
- ✅ Admins can create and manage group classes
- ✅ Students can see and book group sessions from calendar
- ✅ Capacity limits are enforced
- ✅ Waitlists work correctly with position tracking
- ✅ Recurring sessions generate correctly from RRULE
- ✅ All existing private session functionality remains intact

---
## TODO

### Phase 1: Backend Foundation
- [x] Create migration for levels, group_class, group_class_teacher tables
- [x] Create Level entity, module, service, controller
- [x] Create GroupClass and GroupClassTeacher entities
- [x] Create GroupClassesModule with basic CRUD
- [x] Extend Session entity with groupClassId
- [x] Write unit tests for RRULE session generation
- [x] Seed default levels

### Phase 2: Session Generation & Booking
- [x] Implement generateSessions() with RRULE parsing
- [x] Create endpoint POST /group-classes/:id/generate-sessions
- [x] Implement getAvailableSessions() with enrollment counting
- [x] Create endpoint GET /group-classes/available (student view)
- [x] Extend booking flow to support GROUP sessions
- [ ] Write additional integration tests for booking group sessions

### Phase 3: Waitlist
- [x] Extend Waitlist entity with notification fields
- [ ] Implement WaitlistsService methods
- [ ] Create waitlist endpoints (join, leave, list)
- [ ] Integrate waitlist notification on booking cancellation
- [ ] Create admin endpoints for waitlist management
- [ ] Write tests for waitlist flows

### Phase 4: Admin UI
- [ ] Create GroupClasses.vue page component
- [ ] Create GroupClassModal.vue form
- [ ] Create GroupClassSessionsModal.vue
- [ ] Add navigation link in App.vue
- [ ] Implement level management UI (optional settings page)
- [ ] Test admin workflows end-to-end

### Phase 5: Student UI
- [ ] Extend StudentCalendar to fetch and display group sessions
- [ ] Create CalendarFilters.tsx component
- [ ] Create WaitlistModal.tsx component
- [ ] Update booking modal to handle group sessions
- [ ] Create StudentWaitlists block for dashboard
- [ ] Style group session events differently on calendar

### Phase 6: Polish & Testing
- [ ] Write E2E tests (Playwright)
- [ ] Add loading states and error handling
- [ ] Improve UX (tooltips, help text, confirmations)
- [ ] Add accessibility improvements (ARIA labels)
- [ ] Performance optimization (query indexes, caching)
- [ ] Documentation updates