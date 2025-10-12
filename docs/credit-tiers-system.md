# Credit Tiers System

## Overview

The platform uses an internal **tier-based system** to determine which package credits can be used for which sessions. This allows students to use higher-tier credits (e.g., private credits) for lower-tier sessions (e.g., group classes) while preventing the reverse.

**Key Principle**: A credit can be used for any session with an equal or lower tier.

## User-Facing vs Internal Representation

### What Students See
- **Labels**: "Private Credit", "Group Credit", "Premium Private Credit"
- **Duration**: "60-minute credit", "30-minute credit"
- **Simple confirmations**: "Use a private credit for this group class?"
- **NO numeric tiers shown**

### Internal System
- **Numeric tiers**: Used for validation logic only
- **Base service tiers**: PRIVATE=100, GROUP=50
- **Teacher tier modifiers**: Added to base tier
- **Tier comparison**: `packageTier >= sessionTier` → allowed

## Tier Calculation

### Session Tier
```
Session Tier = Base Service Tier + Teacher Tier

Where:
- Base Service Tier:
  - PRIVATE = 100
  - GROUP = 50
  - COURSE = N/A (course sessions use enrollment, not credits)

- Teacher Tier: From teacher.tier column (defaults to 0)
```

**Examples**:
- Private session with standard teacher (tier 0): `100 + 0 = 100`
- Private session with premium teacher (tier 20): `100 + 20 = 120`
- Group session with standard teacher (tier 0): `50 + 0 = 50`
- Group session with premium teacher (tier 20): `50 + 20 = 70`

### Package Tier
```
Package Tier = Base Service Tier + Package Teacher Tier Requirement

Where:
- Base Service Tier: From package metadata service_type (PRIVATE=100, GROUP=50)
- Package Teacher Tier Requirement: From package metadata teacher_tier (defaults to 0)
```

**Examples**:
- Private credit package (no teacher tier req): `100 + 0 = 100`
- Premium private credit package (teacher tier 20 req): `100 + 20 = 120`
- Group credit package (no teacher tier req): `50 + 0 = 50`

### Validation Rule
```typescript
function canUsePackageForSession(pkg: StudentPackage, session: Session): boolean {
  // Course sessions require enrollment, not package credits
  if (session.type === ServiceType.COURSE) {
    return false;
  }

  const packageTier = getPackageTier(pkg);
  const sessionTier = getSessionTier(session);

  // Can use equal or higher tier credit
  return packageTier >= sessionTier;
}
```

## Credit Duration and Fractional Usage

### Fractional Credits
Credits can be split based on duration. The number of credits consumed is:

```
Credits Cost = ceil(sessionDuration / creditUnitMinutes)
```

**Examples**:
- 60-minute credit for 60-minute session: `ceil(60/60) = 1 credit`
- 60-minute credit for 30-minute session: `ceil(30/60) = 1 credit` (rounds up)
- 60-minute credit for two 30-minute sessions: `1 credit each = 2 credits total`
- 30-minute credit for 60-minute session: `ceil(60/30) = 2 credits`

**Important**: Even though the calculation uses ceiling, the system effectively allows splitting. A 60-minute credit can be used for a 30-minute session (consuming 1 credit), leaving the remaining "value" unused. This is by design to keep the system simple.

### Duration Matching
- **Exact match**: 60-min credit for 60-min session (optimal)
- **Over-duration**: 60-min credit for 30-min session (allowed, rounds up to 1 credit)
- **Under-duration**: 30-min credit for 60-min session (consumes 2 credits)

The UI should show clear warnings when credit duration doesn't match session duration.

## Booking Validation Flow

### Step 1: Fetch Compatible Packages
```typescript
GET /api/packages/compatible-for-session/:sessionId

Response:
{
  exactMatch: [
    {
      id: 123,
      label: "Group Credit",
      remainingSessions: 5,
      creditUnitMinutes: 30,
      expiresAt: "2025-12-31T23:59:59Z",
      tier: 50  // Internal only, not shown to user
    }
  ],
  higherTier: [
    {
      id: 124,
      label: "Private Credit",
      remainingSessions: 10,
      creditUnitMinutes: 60,
      expiresAt: "2025-12-31T23:59:59Z",
      tier: 100,
      warningMessage: "This will use a private credit for a group class"
    }
  ],
  recommended: 123,  // Closest to expiry among exact matches, or highest priority
  requiresCourseEnrollment: false,
  isEnrolledInCourse: true
}
```

### Step 2: User Selection
- **Exact match available**: Auto-select recommended, show as default option
- **Only higher-tier available**: Show with confirmation required
- **Multiple options**: Let user choose, default to recommended

### Step 3: Confirmation (if cross-tier)
UI shows:
```
You're about to use a Private Credit (60 minutes) for this Group Class (30 minutes).

This will consume 1 credit from your Private Credit package.

Are you sure you want to continue?

[Cancel] [Confirm Booking]
```

### Step 4: Create Booking
```typescript
POST /api/bookings

{
  sessionId: 456,
  packageId: 124,  // Chosen package
  confirmed: true  // If cross-tier booking, must be true
}

Server validates:
1. Package tier >= session tier
2. Package has sufficient credits
3. Package not expired
4. Session has capacity
5. No existing booking for this student+session

Creates booking with:
- studentPackageId: 124
- creditsCost: ceil(sessionDuration / package.creditUnitMinutes)
```

## Refund Logic

### Cancellation Refund Rule
**Always refund to the original package**, regardless of session type.

```typescript
async refundCreditFromCancellation(bookingId: number): Promise<void> {
  const booking = await this.bookingRepo.findOne({
    where: { id: bookingId },
    relations: ['studentPackage']
  });

  if (!booking.studentPackageId || !booking.creditsCost) {
    return; // No credit to refund (e.g., paid directly)
  }

  // Validate package still exists and is not fully refunded
  const pkg = await this.pkgRepo.findOne({
    where: { id: booking.studentPackageId },
    lock: { mode: 'pessimistic_write' }
  });

  if (!pkg) {
    throw new Error('Original package not found');
  }

  // Atomically increment remainingSessions
  pkg.remainingSessions += booking.creditsCost;
  await this.pkgRepo.save(pkg);

  // Update booking status
  booking.status = BookingStatus.CANCELLED;
  booking.cancelledAt = new Date();
  await this.bookingRepo.save(booking);

  // Log refund in PackageUse table
  await this.packageUseRepo.update(
    { bookingId: booking.id },
    { refundedAt: new Date() }
  );
}
```

### Refund Examples
- **Private credit used for private session → cancelled**: Refund 1 private credit
- **Private credit used for group session → cancelled**: Refund 1 private credit (NOT a group credit)
- **Group credit used for group session → cancelled**: Refund 1 group credit

The refund amount is always `booking.creditsCost`, and it goes to `booking.studentPackageId`.

## Package Selection Algorithm

When multiple compatible packages exist, the system recommends one based on:

1. **Exact tier match preferred** over higher tier
2. **Closest to expiration** (to prevent credit waste)
3. **FIFO** (oldest purchase) as tiebreaker

```typescript
function selectRecommendedPackage(
  exactMatch: StudentPackage[],
  higherTier: StudentPackage[]
): number | null {
  // Prefer exact matches
  const candidates = exactMatch.length > 0 ? exactMatch : higherTier;

  if (candidates.length === 0) return null;

  // Sort by expiration (soonest first), then by purchase date (oldest first)
  candidates.sort((a, b) => {
    // Non-expiring packages go last
    if (!a.expiresAt && !b.expiresAt) {
      return a.purchasedAt.getTime() - b.purchasedAt.getTime();
    }
    if (!a.expiresAt) return 1;
    if (!b.expiresAt) return -1;

    // Compare expiration dates
    const expDiff = a.expiresAt.getTime() - b.expiresAt.getTime();
    if (expDiff !== 0) return expDiff;

    // Tie-breaker: oldest purchase first
    return a.purchasedAt.getTime() - b.purchasedAt.getTime();
  });

  return candidates[0].id;
}
```

## Course Credits (Special Case)

**Course sessions DO NOT use package credits.** They use enrollment-based access control.

### Course Enrollment vs Package Credits
- **Course purchase**: Creates `StudentCourseEnrollment`
- **Course step booking**: Validates enrollment, does not consume credits
- **Bundled credits**: Course may include bonus private/group credits as separate packages

### Validation for Course Sessions
```typescript
if (session.type === ServiceType.COURSE) {
  // Check enrollment, not package credits
  const enrollment = await this.enrollmentRepo.findOne({
    where: {
      studentId: student.id,
      courseProgramId: session.groupClass.courseStep.courseProgramId,
      status: 'ACTIVE'
    }
  });

  if (!enrollment) {
    throw new ForbiddenException('Course enrollment required');
  }

  // Proceed without consuming package credits
}
```

## Edge Cases

### 1. Package Expires During Booking Process
- Validation happens at booking creation time
- If package expires between UI load and booking submission: reject booking
- User should refresh and select different package

### 2. Last Credit Race Condition
- **Handled by pessimistic locking** in `PackagesService.usePackageForSession`
- Transaction locks package row before decrementing
- Second concurrent request will fail with "no remaining credits" error

### 3. Package Deleted/Refunded After Booking
- Soft-delete approach: `deletedAt` timestamp, not hard delete
- Cancelled bookings can still reference original package for refund tracking
- Refund validation checks if package exists and is not fully refunded

### 4. Cross-Tier Booking Without Confirmation
- Server validates `confirmed: true` flag for cross-tier bookings
- Frontend must show confirmation modal and set flag
- Prevents accidental high-tier credit usage

### 5. Multiple Credits for Long Session
- 30-min credit for 90-min session: `ceil(90/30) = 3 credits`
- Validation ensures package has >= 3 remaining sessions
- All credits consumed atomically

### 6. Fractional Session Duration
- Session is 45 minutes, credit is 30 minutes: `ceil(45/30) = 2 credits`
- Session is 25 minutes, credit is 30 minutes: `ceil(25/30) = 1 credit`
- Always rounds up to ensure student is charged fairly

## User Experience Guidelines

### UI Messaging

**When exact match available:**
```
✓ You have 5 Group Credits available (30 minutes each)
[Book with Group Credit]
```

**When only higher-tier available:**
```
⚠ No exact match found

You can use a Private Credit (60 minutes) for this group class.
This will consume 1 credit from your Private Credit package.

[Show Private Credits] → [Confirm Booking]
```

**When duration mismatch:**
```
ℹ This session is 30 minutes, but your credit is for 60 minutes.
You'll use 1 credit for this booking.

Remaining value: 30 minutes (not saved)
```

**When multiple credits needed:**
```
ℹ This session requires 2 of your 30-minute credits (total: 60 minutes)

You currently have 5 credits available.
After booking: 3 credits remaining

[Confirm Booking]
```

### Accessibility
- Use ARIA labels for tier warnings
- Screen reader announces credit type and duration
- Clear visual distinction between exact and cross-tier options
- Confirmation modals properly trap focus

## Implementation Checklist

### Backend
- [x] Database schema supports tier system (via existing metadata)
- [ ] Create `credit-tiers.ts` utility module with tier calculation functions
- [ ] Update `PackagesService.getCompatiblePackagesForSession()`
- [ ] Update `BookingsService.createBooking()` with tier validation
- [ ] Update `BookingsService.cancelBooking()` with correct refund logic
- [ ] Add `GET /api/packages/compatible-for-session/:sessionId` endpoint
- [ ] Unit tests for tier calculations
- [ ] Integration tests for booking + refund flows

### Frontend
- [ ] Create `useCompatibleCredits()` hook
- [ ] Update `ClassModalContent.tsx` to fetch compatible credits
- [ ] Create `CreditSelectionModal.tsx` component
- [ ] Add confirmation flow for cross-tier bookings
- [ ] Add duration mismatch warnings
- [ ] Update booking confirmation page
- [ ] E2E tests for cross-tier booking flow

### Documentation
- [x] This document (`credit-tiers-system.md`)
- [ ] Update `group-classes-plan.md`
- [ ] Update `package-metadata.md`
- [ ] Update `student-booking-cancellation-plan.md`
- [ ] Update `course-programs-plan.md`
- [ ] Add API documentation for new endpoints

### Testing Scenarios
- [ ] Private credit for private session (exact match)
- [ ] Private credit for group session (cross-tier)
- [ ] Group credit for private session (should fail)
- [ ] 60-min credit for 30-min session (duration mismatch)
- [ ] 30-min credit for 60-min session (multiple credits)
- [ ] Cancel cross-tier booking → verify refund to original package
- [ ] Expired package prevents booking
- [ ] Race condition: two users booking last credit
- [ ] Course session rejects package credits

## Future Enhancements

### Premium Teacher Tiers
- Add `teacher.tier` column if not present
- Update tier calculation to include teacher tier
- Create "Premium Private Credit" packages with teacher tier requirements
- UI shows "Premium" badge for high-tier teachers

### Group Credit Packages
- Currently not needed (private credits work for group classes)
- Could introduce for cost savings: cheaper group-only packages
- Would have tier 50, usable only for group sessions

### Dynamic Pricing
- Tier system could support variable pricing per tier level
- Package cost scales with tier
- Requires pricing table and calculation updates

### Credit Pooling/Gifting
- Allow sharing credits between family members
- Tier validation still applies per booking
- Requires account linking and permission system

## Glossary

- **Base Service Tier**: Numeric value assigned to service type (PRIVATE=100, GROUP=50)
- **Teacher Tier**: Numeric value representing teacher's pricing level (stored in `teacher.tier`)
- **Package Tier**: Base service tier + package's teacher tier requirement
- **Session Tier**: Base service tier + session teacher's tier
- **Exact Match**: Package tier equals session tier
- **Cross-Tier Booking**: Using higher-tier package for lower-tier session
- **Credits Cost**: Number of credits consumed, calculated as `ceil(duration / unit)`
- **FIFO**: First In, First Out (oldest package used first)
