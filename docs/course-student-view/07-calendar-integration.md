# Calendar Integration - Course Sessions Display

## Overview

This document details how to integrate course sessions into the student calendar component, allowing students to see their booked course sessions alongside private lessons and group classes.

---

## Current Calendar State

**Component:** `/apps/wordpress/themes/custom-theme/blocks/student-calendar/components/StudentCalendar.tsx`

**Current Data Sources:**
1. Student private session bookings
2. Available group class sessions (in booking mode)
3. Teacher availability slots (in booking mode)

**Need to Add:**
- Student's booked course sessions

---

## Calendar Event Type Support

The `thrive-calendar` web component already supports course sessions via the `ClassEvent` type:

```typescript
interface ClassEvent {
  id: string;
  type: "class";
  serviceType: "PRIVATE" | "GROUP" | "COURSE"; // COURSE already supported
  title: string;
  startUtc: string;
  endUtc: string;
  courseId?: string;
  cohortId?: string;
  sessionId?: string;
  groupClassId?: number;
  capacityMax: number;
  enrolledCount?: number;
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED";
  teacher?: PublicTeacherDto;
  // ... other fields
}
```

**Key Points:**
- `serviceType: "COURSE"` distinguishes course sessions from group/private classes
- Calendar already renders these events correctly
- No calendar component changes needed

---

## Implementation Steps

### Step 1: Add Filter Toggle to StudentCalendar

**File:** `/apps/wordpress/themes/custom-theme/blocks/student-calendar/components/StudentCalendar.tsx`

#### Update Component State

```tsx
// Add to existing state
const [showCourseSessions, setShowCourseSessions] = useState(true);
```

#### Update BookingFilters Component

**File:** `/apps/wordpress/themes/custom-theme/blocks/student-calendar/components/BookingFilters.tsx`

```tsx
interface BookingFiltersProps {
  showPrivateSessions: boolean;
  showGroupClasses: boolean;
  showCourseSessions: boolean; // NEW
  onTogglePrivateSessions: () => void;
  onToggleGroupClasses: () => void;
  onToggleCourseSessions: () => void; // NEW
}

export default function BookingFilters({
  showPrivateSessions,
  showGroupClasses,
  showCourseSessions,
  onTogglePrivateSessions,
  onToggleGroupClasses,
  onToggleCourseSessions,
}: BookingFiltersProps) {
  return (
    <div className="booking-filters">
      <label className="filter-checkbox">
        <input
          type="checkbox"
          checked={showPrivateSessions}
          onChange={onTogglePrivateSessions}
        />
        <span>Private Sessions</span>
      </label>

      <label className="filter-checkbox">
        <input
          type="checkbox"
          checked={showGroupClasses}
          onChange={onToggleGroupClasses}
        />
        <span>Group Classes</span>
      </label>

      <label className="filter-checkbox">
        <input
          type="checkbox"
          checked={showCourseSessions}
          onChange={onToggleCourseSessions}
        />
        <span>Course Sessions</span>
      </label>
    </div>
  );
}
```

---

### Step 2: Fetch Course Sessions

**Add API call to StudentCalendar component:**

```tsx
// Add to existing fetch functions
const fetchCourseSessions = async (fromDate: Date, untilDate: Date) => {
  try {
    const params = new URLSearchParams({
      fromDate: fromDate.toISOString(),
      untilDate: untilDate.toISOString(),
    });

    const response = await fetch(
      `/api/students/me/course-sessions?${params.toString()}`,
      { credentials: "include" }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch course sessions");
    }

    const data = await response.json();
    return data; // Array of ClassEvent
  } catch (err) {
    console.error("Error fetching course sessions:", err);
    return [];
  }
};
```

---

### Step 3: Update Calendar Data Flow

**Modify the useEffect that combines events:**

```tsx
useEffect(() => {
  const loadCalendarData = async () => {
    setLoading(true);

    try {
      // Determine date range from calendar ref
      const fromDate = calendarRef.current?.getStartDate() || new Date();
      const untilDate = calendarRef.current?.getEndDate() || new Date();

      // Fetch all data sources in parallel
      const [bookingsData, groupSessionsData, availabilityData, courseSessionsData] =
        await Promise.all([
          fetchStudentBookings(fromDate, untilDate),
          mode === "booking" && showGroupClasses
            ? fetchAvailableGroupSessions(fromDate, untilDate)
            : Promise.resolve([]),
          mode === "booking" && showPrivateSessions
            ? fetchAvailabilitySlots(fromDate, untilDate)
            : Promise.resolve([]),
          showCourseSessions
            ? fetchCourseSessions(fromDate, untilDate)
            : Promise.resolve([]),
        ]);

      // Combine events
      const eventsList: CalendarEvent[] = [];

      if (showPrivateSessions && mode === "booking") {
        eventsList.push(...availabilityData);
      }

      if (showGroupClasses && mode === "booking") {
        eventsList.push(...groupSessionsData);
      }

      // Always show student's own bookings (private + group + course)
      eventsList.push(...bookingsData);

      // Add course sessions (if not already in bookings)
      if (showCourseSessions) {
        eventsList.push(...courseSessionsData);
      }

      setEvents(eventsList);
    } catch (err) {
      console.error("Error loading calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  loadCalendarData();
}, [
  mode,
  showPrivateSessions,
  showGroupClasses,
  showCourseSessions,
  calendarRef.current,
]);
```

---

### Step 4: Visual Distinction for Course Sessions

#### Update Calendar Styles

**File:** `/apps/wordpress/themes/custom-theme/blocks/student-calendar/style.scss`

```scss
// Add course-specific event styling
thrive-calendar {
  --thrive-cal-event-course-bg: var(--wp--preset--color--purple-100);
  --thrive-cal-event-course-fg: var(--wp--preset--color--purple-900);
}

// Optional: Add icon or badge to course events
.calendar-event[data-service-type="COURSE"] {
  &::before {
    content: "📚";
    margin-right: 0.25rem;
  }
}
```

#### Optional: Update thrive-calendar Component

If you want more granular styling control, update the calendar component:

**File:** `/apps/web-calendar/src/components/week-view.ts`

```typescript
// In renderEvent method, add course-specific class
private renderEvent(event: CalendarEvent) {
  const classes = ["event", `event-${event.type}`];

  if (event.type === "class" && event.serviceType) {
    classes.push(`event-service-${event.serviceType.toLowerCase()}`);
  }

  return html`
    <div
      class="${classes.join(" ")}"
      data-service-type="${event.serviceType || ""}"
      style="${this.getEventStyles(event)}"
    >
      ${event.title}
    </div>
  `;
}
```

---

### Step 5: Event Click Handling

**Update event click handler to show course session details:**

**File:** `StudentCalendar.tsx`

```tsx
const handleEventClick = (event: CustomEvent) => {
  const clickedEvent = event.detail.event as CalendarEvent;

  if (clickedEvent.type === "class" && clickedEvent.serviceType === "COURSE") {
    // Show course session details modal
    setSelectedCourseSession(clickedEvent);
    setShowCourseSessionModal(true);
  } else {
    // Existing logic for private/group sessions
    // ...
  }
};

useEffect(() => {
  const calendar = calendarRef.current;
  if (calendar) {
    calendar.addEventListener("event:click", handleEventClick);
    return () => {
      calendar.removeEventListener("event:click", handleEventClick);
    };
  }
}, []);
```

---

### Step 6: Course Session Detail Modal

**Create new component:**

**File:** `/apps/wordpress/themes/custom-theme/blocks/student-calendar/components/CourseSessionModal.tsx`

```tsx
import React from "react";

interface CourseSessionModalProps {
  session: {
    id: string;
    title: string;
    startUtc: string;
    endUtc: string;
    courseId?: string;
    cohortId?: string;
    teacher?: {
      id: number;
      name: string;
      avatarUrl?: string;
    };
    meetingUrl?: string;
    status: string;
  };
  onClose: () => void;
}

export default function CourseSessionModal({
  session,
  onClose,
}: CourseSessionModalProps) {
  const formatDateTime = (utcString: string) => {
    const date = new Date(utcString);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="course-session-modal">
          <h2>{session.title}</h2>

          <div className="session-detail">
            <strong>Date & Time:</strong>
            <p>{formatDateTime(session.startUtc)}</p>
          </div>

          {session.teacher && (
            <div className="session-detail">
              <strong>Instructor:</strong>
              <div className="teacher-info">
                {session.teacher.avatarUrl && (
                  <img
                    src={session.teacher.avatarUrl}
                    alt={session.teacher.name}
                    className="teacher-avatar"
                  />
                )}
                <span>{session.teacher.name}</span>
              </div>
            </div>
          )}

          <div className="session-detail">
            <strong>Status:</strong>
            <span className={`status-badge status-${session.status.toLowerCase()}`}>
              {session.status}
            </span>
          </div>

          {session.meetingUrl && session.status === "SCHEDULED" && (
            <div className="session-actions">
              <a
                href={session.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button button--primary"
              >
                Join Meeting
              </a>
            </div>
          )}

          {session.courseId && (
            <div className="session-actions">
              <a
                href={`/courses/${session.courseId}`}
                className="button button--secondary"
              >
                View Course Details
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Step 7: API Endpoint Implementation

**Already specified in [02-api-endpoints.md](./02-api-endpoints.md#get-studentsme-course-sessions)**

**Summary:**
- `GET /students/me/course-sessions`
- Query params: `fromDate`, `untilDate`
- Returns: Array of `ClassEvent` with `serviceType: "COURSE"`

**Service Implementation:**

**File:** `/apps/nestjs/src/course-programs/services/course-step-progress.service.ts`

```typescript
async getStudentCourseSessions(
  studentId: number,
  fromDate?: Date,
  untilDate?: Date,
): Promise<ClassEvent[]> {
  // Get all student's course packages
  const packages = await this.packageRepo.find({
    where: { studentId },
    relations: ['courseProgram'],
  });

  if (packages.length === 0) {
    return [];
  }

  // Get booked progress records
  const progressRecords = await this.progressRepo.find({
    where: {
      studentPackageId: In(packages.map(p => p.id)),
      status: In(['BOOKED', 'COMPLETED']),
    },
    relations: ['courseStep', 'session', 'session.groupClass', 'cohort'],
  });

  // Convert to ClassEvent format
  const events: ClassEvent[] = progressRecords
    .filter(prog => {
      if (!prog.session) return false;

      const sessionStart = new Date(prog.session.startUtc);
      if (fromDate && sessionStart < fromDate) return false;
      if (untilDate && sessionStart > untilDate) return false;

      return true;
    })
    .map(prog => ({
      id: `course-session-${prog.sessionId}`,
      type: 'class',
      serviceType: 'COURSE',
      title: `${prog.courseStep.courseProgram.title} - ${prog.courseStep.label}`,
      startUtc: prog.session.startUtc,
      endUtc: prog.session.endUtc,
      courseId: prog.courseStep.courseProgram.id.toString(),
      cohortId: prog.cohortId?.toString(),
      sessionId: prog.sessionId.toString(),
      groupClassId: prog.session.groupClassId,
      capacityMax: prog.session.groupClass.maxStudents,
      enrolledCount: prog.session.groupClass.currentEnrollment,
      status: prog.status === 'COMPLETED' ? 'COMPLETED' : 'SCHEDULED',
      teacher: prog.session.teacher
        ? {
            id: prog.session.teacher.id,
            name: prog.session.teacher.name,
            avatarUrl: prog.session.teacher.avatarUrl,
          }
        : undefined,
      meetingUrl: prog.session.meetingUrl,
    }));

  return events;
}
```

**Controller:**

```typescript
@Get('students/me/course-sessions')
@UseGuards(JwtAuthGuard)
async getMyCourseSessions(
  @Req() req: any,
  @Query('fromDate') fromDate?: string,
  @Query('untilDate') untilDate?: string,
) {
  const from = fromDate ? new Date(fromDate) : undefined;
  const until = untilDate ? new Date(untilDate) : undefined;

  return this.courseStepProgressService.getStudentCourseSessions(
    req.user.id,
    from,
    until,
  );
}
```

---

## Legend/Key Component (Optional Enhancement)

**Add a visual key to help students understand event types:**

**File:** `/apps/wordpress/themes/custom-theme/blocks/student-calendar/components/CalendarLegend.tsx`

```tsx
import React from "react";

export default function CalendarLegend() {
  return (
    <div className="calendar-legend">
      <h4 className="calendar-legend__title">Event Types</h4>
      <div className="calendar-legend__items">
        <div className="legend-item">
          <span className="legend-color legend-color--private"></span>
          <span>Private Lessons</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-color--group"></span>
          <span>Group Classes</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-color--course"></span>
          <span>Course Sessions</span>
        </div>
      </div>
    </div>
  );
}
```

**Styles:**

```scss
.calendar-legend {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--wp--preset--color--gray-50);
  border-radius: 0.5rem;

  &__title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 0.75rem;
  }

  &__items {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.legend-color {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;

  &--private {
    background: var(--thrive-cal-event-booking-bg, #3b82f6);
  }

  &--group {
    background: var(--thrive-cal-event-class-bg, #10b981);
  }

  &--course {
    background: var(--thrive-cal-event-course-bg, #8b5cf6);
  }
}
```

---

## Testing Checklist

- [ ] Course sessions API endpoint returns correct data
- [ ] Course sessions appear on student calendar
- [ ] Filter toggle shows/hides course sessions
- [ ] Course sessions visually distinct from other events
- [ ] Clicking course session opens detail modal
- [ ] Modal displays correct session information
- [ ] Meeting URL link works (if applicable)
- [ ] Date range filtering works correctly
- [ ] Calendar performance acceptable with mixed event types
- [ ] Mobile responsive
- [ ] No duplicate events (if student booking includes course sessions)

---

## Performance Considerations

### Preventing Duplicate Events

If `/students/me/sessions` already includes course sessions, you may see duplicates. Options:

**Option A: Filter duplicates in frontend**
```tsx
const uniqueEvents = eventsList.filter((event, index, self) =>
  index === self.findIndex((e) => e.id === event.id)
);
setEvents(uniqueEvents);
```

**Option B: Backend returns distinct endpoint**
- Keep `/students/me/sessions` for private/group only
- Keep `/students/me/course-sessions` for courses only
- Combine in frontend

**Recommended:** Option B for clarity.

---

## Implementation Checklist

### Backend
- [ ] Implement `GET /students/me/course-sessions` endpoint
- [ ] Test API with booked course sessions
- [ ] Verify date filtering works
- [ ] Return correct ClassEvent format

### Frontend
- [ ] Add `showCourseSessions` state to StudentCalendar
- [ ] Add course sessions toggle to BookingFilters
- [ ] Implement `fetchCourseSessions` function
- [ ] Update event combination logic
- [ ] Add course session click handler
- [ ] Create CourseSessionModal component
- [ ] Add visual distinction styling
- [ ] Optional: Add CalendarLegend component

### Testing
- [ ] All checklist items above
- [ ] Cross-browser testing
- [ ] Mobile/tablet/desktop responsive
- [ ] Performance with 50+ mixed events

---

## Future Enhancements (Out of Scope)

- Export course schedule to Google Calendar/iCal
- Reminders for upcoming course sessions
- Attendance tracking
- Post-session feedback/ratings
- Homework/materials links
- Session recording links

---

## Completion

After implementing calendar integration:
1. Test complete student journey: enroll → book → view calendar → attend session
2. Verify all event types display correctly
3. Ensure performance is acceptable
4. Document any edge cases or known issues

**All documentation files now complete! Ready for implementation.**
