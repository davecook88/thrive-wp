# Student Booking Cancellation & Rescheduling Plan

## Overview

Allow students to cancel and reschedule their bookings with configurable time-based policies. Keep the implementation simple and leverage existing systems.

## Semantic Model: Session vs Booking

**Session** = A scheduled time slot (the "class" itself)
- Represents a teacher's scheduled availability/class at a specific time
- Has a type: PRIVATE (1:1), GROUP (multiple students), or COURSE (part of a course)
- Has capacity (max students)
- Has status: DRAFT, SCHEDULED, CANCELLED, COMPLETED
- Examples:
  - "Spanish 101 group class on Tuesday 3pm-4pm" (GROUP session, capacity=6)
  - "Private conversation slot ### Phase 4: Student UI - Cancellation
- [x] Create booking policy notice React block
- [x] Create booking actions modal React component
- [x] Implement cancel confirmation flow
- [x] Wire up calendar click handler
- [ ] Test end-to-end cancellationaria on Wed 2pm-3pm" (PRIVATE session, capacity=1)

**Booking** = A student's reservation for a seat in a session
- Links a student to a session (many-to-one: many bookings per session)
- Has status: CONFIRMED, CANCELLED, PENDING, etc.
- Represents the student's "ticket" to attend that session
- Tracks payment/credit usage (studentPackageId, creditsCost)

**Key Distinctions**:
- A GROUP session can have multiple bookings (one per student, up to capacity)
- A PRIVATE session typically has only one booking (capacity=1)
- When a student cancels a booking, the session remains (other students may still be booked)
- If ALL bookings are cancelled for a session, the session can remain SCHEDULED (teacher availability still exists) or be CANCELLED by admin
- A session can be CANCELLED by admin/teacher (affects all bookings)

**Cancellation Implications**:
- **Student cancels GROUP/COURSE booking**: Booking status → CANCELLED, session stays SCHEDULED (capacity freed up for others)
- **Student cancels PRIVATE booking**: Booking status → CANCELLED, AND session status → CANCELLED (since capacity=1, no point keeping empty session)
- **Teacher/admin cancels session**: Session status → CANCELLED, all related bookings should be automatically CANCELLED/notified
- **Rescheduling a booking**: Cancel old booking (and session if PRIVATE), create new booking for a different session

## Core Philosophy

**Rescheduling = Cancel + Rebook**
- When a student reschedules, we simply:
  1. Cancel the existing booking
  2. Refund the credit to their package (if applicable)
  3. Let them book a new slot using the normal booking flow
  4. Track reschedule count to enforce limits

This avoids complex "move" logic and reuses existing booking validation.

---

## Database Changes

### 1. Cancellation Policy Table (new)

Single table storing the current active policy:

```sql
CREATE TABLE cancellation_policy (
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Cancellation settings
  allow_cancellation BOOLEAN DEFAULT TRUE,
  cancellation_deadline_hours INT DEFAULT 24,
  refund_credits_on_cancel BOOLEAN DEFAULT TRUE,

  -- Rescheduling settings
  allow_rescheduling BOOLEAN DEFAULT TRUE,
  rescheduling_deadline_hours INT DEFAULT 24,
  max_reschedules_per_booking INT DEFAULT 2,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  policy_name VARCHAR(255),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL
);

-- Seed default policy
INSERT INTO cancellation_policy (policy_name, is_active)
VALUES ('Default Policy', TRUE);
```

### 2. Booking Table Extensions

Add minimal tracking fields to `booking` table:

```sql
ALTER TABLE booking
  ADD COLUMN rescheduled_count INT DEFAULT 0
    COMMENT 'Number of times this booking has been rescheduled',
  ADD COLUMN original_session_id INT NULL
    COMMENT 'Original session if rescheduled',
  ADD COLUMN cancelled_by_student BOOLEAN DEFAULT FALSE
    COMMENT 'Whether cancelled by student vs admin';
```

**Note**: Existing `cancelled_at`, `cancellation_reason`, and `status` fields already support cancellation.

**Reschedule tracking**: When a student reschedules:
- Old booking: status → CANCELLED, rescheduledCount stays (shows history)
- New booking: created with originalSessionId pointing to old session, rescheduledCount = old.rescheduledCount + 1
- This allows enforcing max reschedules across the chain

---

## Backend API (NestJS)

### Policies Endpoints

```typescript
// GET /api/policies/cancellation
// Returns current active policy (public endpoint)
{
  allowCancellation: boolean;
  cancellationDeadlineHours: number;
  allowRescheduling: boolean;
  reschedulingDeadlineHours: number;
  maxReschedulesPerBooking: number;
  refundCreditsOnCancel: boolean;
}

// POST /api/policies/cancellation (admin only)
// Creates or updates the active policy
{
  allowCancellation: boolean;
  cancellationDeadlineHours: number;
  // ... other fields
}
```

### Booking Modification Endpoints

```typescript
// GET /api/bookings/student/:studentId
// Returns all bookings for a student with modification metadata
{
  bookings: [{
    id: number;
    sessionId: number;
    session: {
      startAt: string; // ISO UTC
      endAt: string;
      teacherId: number;
    };
    status: 'CONFIRMED' | 'CANCELLED' | ...;
    rescheduledCount: number;
    canCancel: boolean;  // computed based on policy + session time
    canReschedule: boolean; // computed based on policy + reschedule count + time
    cancellationDeadline: string | null; // ISO UTC
  }]
}

// POST /api/bookings/:id/cancel
// Request body (optional):
{
  reason?: string;
}
// Response:
{
  success: boolean;
  creditRefunded: boolean;
  refundedToPackageId?: number;
}

// GET /api/bookings/:id/can-modify
// Quick check endpoint
{
  canCancel: boolean;
  canReschedule: boolean;
  reason?: string; // If not allowed, why
  hoursUntilSession: number;
}
```

### Business Logic

**CancellationService.canCancelBooking(bookingId, studentId)**
- Load active policy
- Load booking with session
- Check: Is booking CONFIRMED?
- Check: Does booking belong to student?
- Check: Is policy.allowCancellation true?
- Calculate hours until session: `(session.startAt - now) / 3600000`
- Check: hoursUntilSession >= policy.cancellationDeadlineHours?
- Return: { allowed: boolean, reason?: string }

**CancellationService.canRescheduleBooking(bookingId, studentId)**
- Same checks as cancel, plus:
- Check: Is policy.allowRescheduling true?
- Check: booking.rescheduledCount < policy.maxReschedulesPerBooking?
- Check: hoursUntilSession >= policy.reschedulingDeadlineHours?

**CancellationService.cancelBooking(bookingId, studentId, reason?)**
- Verify canCancelBooking()
- Transaction:
  1. Update booking: status = CANCELLED, cancelledAt = now, cancelledByStudent = true, cancellationReason = reason
  2. If booking.studentPackageId && policy.refundCreditsOnCancel:
     - **Refund to original package**: Increment `studentPackage.remainingSessions` by `booking.creditsCost`
     - This ensures that if a PRIVATE credit was used for a GROUP class, the PRIVATE credit is refunded (not a GROUP credit)
     - Update packageUse.refundedAt (if exists)
  3. **If session.type === 'PRIVATE'**: Also cancel the session (status = CANCELLED) since it was a 1:1 session with only this booking
  4. Session capacity management handled by existing logic (cancelled bookings don't count toward capacity)
- Return success + credit refund details + sessionCancelled flag

**Credit Refund Logic (Critical)**:
```typescript
async refundCreditFromCancellation(bookingId: number): Promise<RefundResult> {
  const booking = await this.bookingRepo.findOne({
    where: { id: bookingId },
    relations: ['studentPackage', 'session']
  });

  if (!booking.studentPackageId || !booking.creditsCost) {
    return { refunded: false, reason: 'No package credit used' };
  }

  // Atomically refund to the ORIGINAL package
  await this.pkgRepo.manager.transaction(async (tx) => {
    const pkg = await tx.findOne(StudentPackage, {
      where: { id: booking.studentPackageId },
      lock: { mode: 'pessimistic_write' }
    });

    if (!pkg) {
      throw new NotFoundException('Original package not found');
    }

    // Refund the exact amount consumed (may be > 1 for long sessions)
    pkg.remainingSessions += booking.creditsCost;
    await tx.save(StudentPackage, pkg);

    // Mark package use as refunded
    await tx.update(PackageUse,
      { bookingId: booking.id },
      { refundedAt: new Date() }
    );
  });

  return {
    refunded: true,
    packageId: booking.studentPackageId,
    creditsRefunded: booking.creditsCost,
    packageLabel: getPackageDisplayLabel(booking.studentPackage)
  };
}
```

**Examples**:
- Student books GROUP class with PRIVATE credit (60 min) → consumes 1 credit
  - Cancel → refund 1 PRIVATE credit (NOT a GROUP credit)
- Student books PRIVATE class with PRIVATE credit (30 min) → consumes 1 credit
  - Cancel → refund 1 PRIVATE credit
- Student books long GROUP class (90 min) with 30-min GROUP credits → consumes 3 credits
  - Cancel → refund 3 GROUP credits

See [`docs/credit-tiers-system.md`](credit-tiers-system.md) for complete tier system documentation.

**Rescheduling Flow (simple)**
1. Student clicks "Reschedule" on a booking
2. Frontend calls `POST /api/bookings/:id/cancel` with special flag or just checks canReschedule first
3. On successful cancel, increment booking.rescheduledCount
4. Frontend shows calendar for student to pick new slot
5. Student books normally using existing booking flow
6. New booking references original via originalSessionId

**Alternative: Single Reschedule Endpoint**
```typescript
// POST /api/bookings/:id/reschedule
{
  newSessionId: number; // Student picks from available sessions
}
// Internally:
// 1. Validate can reschedule
// 2. Cancel old booking (refund credit)
// 3. Create new booking (consume credit)
// 4. Link via originalSessionId
// 5. Increment rescheduledCount on NEW booking
```

This avoids two separate API calls and ensures atomicity.

---

## Admin Settings UI (Thrive Admin Plugin - Vue)

### Settings.vue Extension

Add new settings section:

```vue
<div class="wp-admin-card">
  <h3>Student Booking Policies</h3>

  <!-- Cancellation Settings -->
  <div class="form-section">
    <h4>Cancellation</h4>
    <label>
      <input type="checkbox" v-model="policies.allowCancellation">
      Allow students to cancel bookings
    </label>

    <label>
      Hours before class that cancellation is allowed:
      <input type="number" v-model.number="policies.cancellationDeadlineHours" min="1" max="168">
    </label>

    <label>
      <input type="checkbox" v-model="policies.refundCreditsOnCancel">
      Refund package credits when student cancels
    </label>
  </div>

  <!-- Rescheduling Settings -->
  <div class="form-section">
    <h4>Rescheduling</h4>
    <label>
      <input type="checkbox" v-model="policies.allowRescheduling">
      Allow students to reschedule bookings
    </label>

    <label>
      Hours before class that rescheduling is allowed:
      <input type="number" v-model.number="policies.reschedulingDeadlineHours" min="1" max="168">
    </label>

    <label>
      Maximum reschedules per booking:
      <input type="number" v-model.number="policies.maxReschedulesPerBooking" min="0" max="10">
    </label>
  </div>

  <button @click="savePolicies">Save Policies</button>
</div>
```

### Vue API Integration

The Settings.vue component should fetch and save directly to NestJS:

```typescript
// wordpress/plugins/thrive-admin/src/components/Settings.vue (script section)

async function loadPolicies() {
  const response = await fetch('/api/policies/cancellation');
  const data = await response.json();
  policies.value = data;
}

async function savePolicies() {
  const response = await fetch('/api/policies/cancellation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(policies.value)
  });

  if (response.ok) {
    showSuccess.value = true;
  } else {
    alert('Failed to save policies');
  }
}

onMounted(() => {
  loadPolicies();
});
```

No PHP bridge needed - direct API calls from Vue to NestJS.

---

## Student-Facing UI (WordPress Theme)

### 1. Policy Information Display (React Block)

Create a React block to display policy information:

**File**: `wordpress/themes/custom-theme/blocks/booking-policy-notice/`

**Block structure**:
```
blocks/booking-policy-notice/
  ├── block.json
  ├── index.tsx (editor)
  ├── view.tsx (frontend React component)
  └── render.php (server-side render)
```

**view.tsx** (frontend):
```tsx
import { useEffect, useState } from '@wordpress/element';

interface CancellationPolicy {
  allowCancellation: boolean;
  cancellationDeadlineHours: number;
  allowRescheduling: boolean;
  reschedulingDeadlineHours: number;
  maxReschedulesPerBooking: number;
  refundCreditsOnCancel: boolean;
}

export default function BookingPolicyNotice() {
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);

  useEffect(() => {
    fetch('/api/policies/cancellation')
      .then(r => r.json())
      .then(data => setPolicy(data));
  }, []);

  if (!policy) return <div>Loading policy...</div>;

  const messages = [];
  if (policy.allowCancellation) {
    messages.push(`✅ You can cancel up to ${policy.cancellationDeadlineHours} hours before your class`);
  }
  if (policy.allowRescheduling) {
    messages.push(`🔄 You can reschedule up to ${policy.maxReschedulesPerBooking} times per booking (at least ${policy.reschedulingDeadlineHours} hours before)`);
  }
  if (policy.refundCreditsOnCancel) {
    messages.push(`💳 Credits are refunded when you cancel`);
  }

  return (
    <div className="booking-policy-notice">
      <h4>📋 Booking Policy</h4>
      <ul>
        {messages.map((msg, i) => <li key={i}>{msg}</li>)}
      </ul>
    </div>
  );
}
```

Use this block on student dashboard pages via the block editor.

### 2. Booked Session Modal

When student clicks a booked session in calendar, show a modal with actions.

**Implementation Approach**: Use existing `thrive-calendar-modal` block architecture (see `docs/thrive-modal-architecture.md`)

**Calendar event click handler** (existing):
```typescript
// web-components/thrive-calendar/src/components/week-view.ts
private onEventClick(event: CalendarEvent) {
  this.emit("event:click", { event });
}
```

**Theme integration** (new):
```typescript
// wordpress/themes/custom-theme/blocks/student-calendar/view.ts

calendar.addEventListener('event:click', async (e) => {
  const event = e.detail.event;

  // Only handle booked events (type === 'booking')
  if (event.type !== 'booking') return;

  // Fetch modification permissions
  const response = await fetch(`/api/bookings/${event.bookingId}/can-modify`);
  const permissions = await response.json();

  // Open modal with dynamic content
  openBookingModal({
    event,
    canCancel: permissions.canCancel,
    canReschedule: permissions.canReschedule,
    reason: permissions.reason,
    hoursUntilSession: permissions.hoursUntilSession
  });
});
```

**Modal Content** (WordPress block or template):

Create a reusable modal template:

```html
<div class="booking-details-modal">
  <h3>{{sessionTitle}}</h3>
  <p>📅 {{sessionDate}} at {{sessionTime}}</p>
  <p>👨‍🏫 Teacher: {{teacherName}}</p>

  <div class="booking-actions">
    <!-- Cancel Button -->
    <button
      class="btn-cancel"
      data-booking-id="{{bookingId}}"
      {{#unless canCancel}}disabled{{/unless}}>
      Cancel Booking
    </button>

    <!-- Reschedule Button -->
    <button
      class="btn-reschedule"
      data-booking-id="{{bookingId}}"
      {{#unless canReschedule}}disabled{{/unless}}>
      Reschedule
    </button>

    <!-- Status message if actions disabled -->
    {{#if reason}}
      <p class="notice">ℹ️ {{reason}}</p>
    {{/if}}

    <!-- Countdown -->
    {{#if canCancel}}
      <p class="deadline-notice">
        ⏰ You have {{hoursUntilSession}} hours remaining to modify this booking
      </p>
    {{/if}}
  </div>
</div>
```

### 3. Cancel Confirmation Flow

```javascript
// wordpress/themes/custom-theme/assets/js/booking-actions.js

async function handleCancelBooking(bookingId) {
  // Confirmation dialog
  const confirmed = confirm(
    'Are you sure you want to cancel this booking?\n\n' +
    'Your credit will be refunded to your package.'
  );

  if (!confirmed) return;

  // Optional: Ask for reason
  const reason = prompt('Reason for cancellation (optional):');

  // Call API
  const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });

  const result = await response.json();

  if (result.success) {
    alert('✅ Booking cancelled successfully!' +
          (result.creditRefunded ? '\nYour credit has been refunded.' : ''));

    // Refresh calendar
    location.reload(); // Simple approach, or use calendar.refresh()
  } else {
    alert('❌ Failed to cancel booking: ' + (result.error || 'Unknown error'));
  }
}
```

### 4. Reschedule Flow

**Option A: Two-Step Manual (Simpler)**
```javascript
async function handleRescheduleBooking(bookingId) {
  const confirmed = confirm(
    'To reschedule:\n' +
    '1. We will cancel this booking and refund your credit\n' +
    '2. You can then select a new time from the calendar\n\n' +
    'Continue?'
  );

  if (!confirmed) return;

  // Cancel the booking
  const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: 'Student rescheduling',
      isRescheduling: true
    })
  });

  const result = await response.json();

  if (result.success) {
    alert('✅ Booking cancelled. Your credit has been refunded.\n\nPlease select a new time slot from the calendar.');
    location.reload();
  }
}
```

**Option B: Dedicated Reschedule Endpoint (Atomic)**
```javascript
async function handleRescheduleBooking(bookingId) {
  // Show calendar picker for student to select new slot
  const newSessionId = await showSessionPicker(); // Returns selected session ID

  if (!newSessionId) return;

  const response = await fetch(`/api/bookings/${bookingId}/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newSessionId })
  });

  const result = await response.json();

  if (result.success) {
    alert('✅ Booking rescheduled successfully!');
    location.reload();
  }
}
```

---

## Calendar Component Integration

### Event Metadata Enhancement

Extend calendar events to include modification status:

```typescript
// wordpress/themes/custom-theme/types/calendar.ts

interface BookingCalendarEvent extends BaseCalendarEvent {
  type: 'booking';
  bookingId: number;
  canCancel: boolean;      // Computed server-side
  canReschedule: boolean;  // Computed server-side
  rescheduledCount: number;
  deadlineUtc: string;     // When they can no longer modify
}
```

### Visual Indicators

Add CSS classes to booked events based on modification status:

```typescript
// web-components/thrive-calendar/src/components/week-view.ts

const eventClasses = [
  'event',
  event.type,
  event.canCancel ? 'modifiable' : 'locked',
  event.deadlineApproaching ? 'deadline-soon' : ''
].join(' ');
```

CSS styling:
```css
.event.booking.modifiable {
  border-left: 3px solid #10b981; /* Green = can modify */
}

.event.booking.locked {
  border-left: 3px solid #ef4444; /* Red = locked */
  opacity: 0.7;
}

.event.booking.deadline-soon {
  animation: pulse 2s infinite;
}
```

---

## Implementation Order

### Phase 1: Backend Foundation
1. Create migration for `cancellation_policy` table and `booking` columns
2. Create `PoliciesModule` with entity, service, controller
3. Create default policy seed
4. Add endpoints: GET /policies/cancellation, POST /policies/cancellation (admin)

### Phase 2: Booking Cancellation
1. Create `BookingsModule` with service and controller
2. Implement `canCancelBooking()` and `cancelBooking()` methods
3. Add endpoint: POST /bookings/:id/cancel
4. Add endpoint: GET /bookings/:id/can-modify
5. Test credit refund logic

### Phase 3: Admin Settings
1. Update `Settings.vue` with policy form
2. Add direct API fetch calls (no bridge needed)
3. Test policy updates propagate to NestJS

### Phase 4: Student UI - Cancellation
1. Create booking policy notice React block
2. Create booking actions modal React component
3. Implement cancel confirmation flow
4. Wire up calendar click handler
5. Test end-to-end cancellation

### Phase 5: Rescheduling (Choose Approach)
1. Implement `canRescheduleBooking()` method
2. Either:
   - **Simple**: Add reschedule flag to cancel endpoint + two-step UI
   - **Atomic**: Create POST /bookings/:id/reschedule endpoint
3. Update frontend with reschedule button and flow
4. Track reschedule count enforcement

### Phase 6: Visual Polish
1. Add CSS classes for modification status
2. Add countdown timers for deadlines
3. Add hover tooltips showing policy
4. Responsive design for mobile

### Phase 7: Documentation
1. Update `CLAUDE.md` with new endpoints
2. Create user-facing help docs
3. Admin guide for policy configuration

---

## Implementation Todo List

### Phase 1: Backend Foundation
- [x] Create migration for `cancellation_policy` table and `booking` columns
- [x] Create `PoliciesModule` with entity, service, controller
- [x] Create default policy seed
- [x] Add endpoints: GET /policies/cancellation, POST /policies/cancellation (admin)

### Phase 2: Booking Cancellation
- [x] Create `BookingsModule` with service and controller
- [x] Implement `canCancelBooking()` and `cancelBooking()` methods
- [x] Add endpoint: POST /bookings/:id/cancel
- [x] Add endpoint: GET /bookings/:id/can-modify
- [x] Test credit refund logic

### Phase 3: Admin Settings
- [x] Update `Settings.vue` with policy form
- [x] Add direct API fetch calls (no bridge needed)
- [x] Test policy updates propagate to NestJS

### Phase 4: Student UI - Cancellation
- [x] Create booking policy notice React block
- [x] Create booking actions modal React component
- [x] Implement cancel confirmation flow
- [ ] Wire up calendar click handler
- [ ] Test end-to-end cancellation

### Phase 5: Rescheduling (Choose Approach)
- [x] Implement `canRescheduleBooking()` method
- [ ] Decide between Option A (Cancel + manual rebook) vs Option B (Atomic reschedule endpoint)
- [x] Update frontend with reschedule button and flow
- [ ] Track reschedule count enforcement

### Phase 6: Visual Polish
- [ ] Add CSS classes for modification status
- [ ] Add countdown timers for deadlines
- [ ] Add hover tooltips showing policy
- [ ] Responsive design for mobile

### Phase 7: Documentation
- [ ] Update `CLAUDE.md` with new endpoints
- [ ] Create user-facing help docs
- [ ] Admin guide for policy configuration

---

## Open Questions / Decisions Needed

1. **Rescheduling Implementation**:
   - Option A (simpler): Cancel + manual rebook
   - Option B (better UX): Atomic reschedule endpoint with slot picker

2. **Penalty System**: Do we need penalty tracking in v1? Or keep it simple (just block late cancellations)?

3. **Refund Edge Cases**: What happens if student package has expired? Still refund credit?

4. **Admin Override**: Should admins be able to cancel/reschedule regardless of policy?

5. **Notifications**: Should students receive email confirmation when they cancel/reschedule?

---

## Success Criteria

- ✅ Admin can configure cancellation/rescheduling policies
- ✅ Students see clear policy information before booking
- ✅ Students can cancel bookings within deadline
- ✅ Credits are refunded correctly when cancelling package-based bookings
- ✅ Students cannot cancel after deadline (UI shows reason)
- ✅ Students can reschedule within limits (count + time deadline)
- ✅ Calendar shows visual indicators of modification status
- ✅ All operations are atomic (no partial states)
- ✅ No bugs in existing booking/payment flows
