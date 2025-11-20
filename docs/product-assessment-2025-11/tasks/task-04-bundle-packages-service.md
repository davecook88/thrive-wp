# Task 04: Bundle Packages Service Layer

**Priority:** CRITICAL (Blocks flexible pricing)  
**Estimate:** 2-3 weeks  
**Complexity:** High  
**Dependencies:** None (can run in parallel with Task 01-03)

## Objective

Refactor the packages service layer to support bundle packages containing multiple service types (PRIVATE, GROUP, COURSE) with independent credit allowances, replacing the current single-service-type package system.

## Current State

✅ **Database Schema Complete:**
- `package_allowance` table created
- `student_package_balance` table created (NOT USED YET)
- `package_use.service_type` column added
- Migration executed successfully

✅ **Entities Created:**
- `PackageAllowance` entity with relations
- `StripeProductMap.allowances` relation added

🔴 **Services Still Use Old Logic:**
- `PackagesService` assumes single service type per package
- `PaymentsService` webhook doesn't create balances
- `BookingsService` doesn't select correct balance type
- Balance tracking happens in-memory, not persisted

## What to Refactor

### 1. PackagesService — 12 Methods

**File:** `apps/nestjs/src/packages/packages.service.ts`

**Critical Methods (Follow checklist precisely):**

#### `createPackage(dto)` (Lines 384-488)
- Accept `allowances: PackageAllowanceDto[]` instead of single `serviceType`
- Validate each allowance (credits > 0, valid tier, valid duration)
- Create single Stripe product for entire bundle
- Store allowances in Stripe metadata
- Create `PackageAllowance` rows via repository
- Generate auto bundle description if not provided
- **Checklist:** `../../phase4-implementation-checklist.md` Step 9

#### `usePackageForSession(studentId, packageId, sessionId, options)` (Lines 538-584)
- Accept optional `balanceId` or auto-find compatible balance
- Load `StudentPackageBalance` with pessimistic lock
- Validate `balance.remainingCredits >= creditsUsed`
- Decrement correct balance (NOT package.remainingSessions)
- Create `PackageUse` with `serviceType` and `creditsUsed`
- **Checklist:** `../../phase4-implementation-checklist.md` Step 11

#### `getCompatiblePackagesForSession(studentId, sessionId)` (Lines 696-800)
- Load packages with `balances` relation
- For each balance, check `canUseBalanceForSession(balance, session)`
- Return balances (not just packages) grouped by exact match / higher tier
- **Checklist:** `../../phase4-implementation-checklist.md` Step 12

**Other Methods to Update:**
- `getPackages()` — Load allowances, return in DTO
- `getActivePackages()` — Same as above
- `getValidPackagesForSession()` — Query allowances matching session type
- `getActivePackagesForStudent()` — Load balances, calculate totals by type
- `generateLookupKey()` — Use bundle description for key

**See:** `../../phase4-implementation-checklist.md` for line-by-line instructions

---

### 2. PaymentsService — Webhook Handler

**File:** `apps/nestjs/src/payments/payments.service.ts`

#### `handlePackagePurchase()` (Lines 407-602)

**Current Logic:**
1. Parse Stripe session metadata
2. Find `StripeProductMap` by product ID
3. Create `StudentPackage` row
4. ~~Set `remainingSessions`~~ (REMOVE)

**New Logic:**
1. Parse Stripe session metadata
2. Find `StripeProductMap` by product ID with `allowances` relation
3. Create `StudentPackage` row (totalSessions = sum of all allowance credits)
4. **NEW:** Loop through `stripeProductMap.allowances`
5. **NEW:** For each allowance, create `StudentPackageBalance`:
   ```typescript
   const balance = this.balanceRepo.create({
     studentPackageId: package.id,
     serviceType: allowance.serviceType,
     teacherTier: allowance.teacherTier,
     creditUnitMinutes: allowance.creditUnitMinutes,
     totalCredits: allowance.credits,
     remainingCredits: allowance.credits,
   });
   await this.balanceRepo.save(balance);
   ```

**Testing:**
- Create bundle: 5 PRIVATE (30min) + 3 GROUP (60min)
- Purchase via Stripe test checkout
- Verify 2 `StudentPackageBalance` rows created with correct credits

---

### 3. BookingsService — Balance Selection

**File:** `apps/nestjs/src/bookings/bookings.service.ts`

#### `createBooking()` (Lines 60-161)

**Changes:**
- Load package with `balances` relation
- Find compatible balance using `findCompatibleBalances(balances, session)`
- Call `packagesService.usePackageForSession(student.id, balanceId, session.id)`
- Store balance info in booking for audit trail

#### `cancelBooking()` (Lines 273-348)

**Changes:**
- Get `PackageUse` to find which balance was decremented
- Use `packageUse.serviceType` to find correct balance
- Increment `balance.remainingCredits`
- Mark `packageUse` as refunded

---

### 4. Credit Tiers Utilities

**File:** `apps/nestjs/src/common/types/credit-tiers.ts`

**New Functions:**

```typescript
export function canUseBalanceForSession(
  balance: StudentPackageBalance,
  session: Session
): boolean {
  // Check service type match
  if (balance.serviceType !== session.type) return false;
  
  // Check tier compatibility (use existing tier logic)
  if (!canUsePackageForTier(balance.teacherTier, session.teacher.tier)) {
    return false;
  }
  
  // Check not expired
  const pkg = balance.studentPackage;
  if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
    return false;
  }
  
  return balance.remainingCredits > 0;
}

export function findCompatibleBalances(
  balances: StudentPackageBalance[],
  session: Session
): { exactMatch: StudentPackageBalance[]; higherTier: StudentPackageBalance[] } {
  const exactMatch = balances.filter(
    b => b.serviceType === session.type && b.teacherTier === session.teacher.tier
  );
  const higherTier = balances.filter(
    b => b.serviceType === session.type && b.teacherTier < session.teacher.tier
  );
  return { exactMatch, higherTier };
}
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] Can create bundle package via API with multiple allowances
- [ ] Allowances stored in `package_allowance` table correctly
- [ ] Stripe product metadata includes full allowance details
- [ ] Purchasing bundle creates `StudentPackageBalance` rows (one per allowance)
- [ ] Booking private session decrements PRIVATE balance only
- [ ] Booking group session decrements GROUP balance only
- [ ] Course sessions decrement COURSE balance only
- [ ] Cannot book if balance insufficient for that service type
- [ ] Canceling booking refunds to correct balance
- [ ] `/packages/my-credits` returns breakdown by service type
- [ ] Frontend can display multi-type credit balances

### Data Integrity

- [ ] No orphaned balances (cascade deletes work)
- [ ] Balance never goes negative
- [ ] PackageUse.serviceType always populated for bundle usage
- [ ] Sum of balances.totalCredits equals package.totalSessions

### Edge Cases

- [ ] Expired packages cannot be used (check balance expiration)
- [ ] Empty allowances array rejected (validation error)
- [ ] Duplicate service types in allowances allowed (valid use case)
- [ ] Concurrent booking attempts use pessimistic locking correctly
- [ ] Webhook idempotency (don't create duplicate balances)

---

## Testing Strategy

### Unit Tests

**File:** `apps/nestjs/src/packages/packages.service.spec.ts`

```typescript
describe('Bundle Packages', () => {
  it('should create package with multiple allowances', async () => {
    const dto = {
      name: 'Starter Bundle',
      allowances: [
        { serviceType: 'PRIVATE', credits: 5, creditUnitMinutes: 30, teacherTier: 0 },
        { serviceType: 'GROUP', credits: 3, creditUnitMinutes: 60, teacherTier: 0 },
      ],
      amountMinor: 19900,
      currency: 'USD',
    };
    const result = await service.createPackage(dto);
    expect(result.allowances).toHaveLength(2);
  });

  it('should decrement correct balance when using package', async () => {
    // Setup: student has bundle with PRIVATE and GROUP credits
    // Action: book PRIVATE session
    // Assert: PRIVATE balance decremented, GROUP balance unchanged
  });
});
```

### Integration Tests

**File:** `apps/nestjs/src/payments/payments.service.spec.ts`

```typescript
it('should create balances on webhook for bundle purchase', async () => {
  const session = mockStripeSession({
    metadata: { productId: 'prod_bundle_123' }
  });
  
  await service.handleCheckoutSuccess(session);
  
  const balances = await balanceRepo.find({
    where: { studentPackage: { stripeSession: session.id } }
  });
  
  expect(balances).toHaveLength(2); // PRIVATE + GROUP
  expect(balances[0].serviceType).toBe('PRIVATE');
  expect(balances[0].remainingCredits).toBe(5);
});
```

### E2E Tests

**File:** `apps/nestjs/test/packages.e2e-spec.ts`

```typescript
describe('Bundle Package E2E', () => {
  it('complete flow: create bundle → purchase → book → cancel', async () => {
    // 1. Admin creates bundle
    const pkg = await createBundle({ /* ... */ });
    
    // 2. Student purchases via Stripe
    const checkout = await simulateStripePurchase(pkg.stripe.priceId);
    
    // 3. Verify balances created
    const balances = await getBalances(student.id);
    expect(balances.PRIVATE).toBe(5);
    expect(balances.GROUP).toBe(3);
    
    // 4. Book private session
    await bookSession(privateSession.id, student.id);
    expect(await getBalances(student.id).PRIVATE).toBe(4);
    
    // 5. Cancel booking
    await cancelBooking(booking.id);
    expect(await getBalances(student.id).PRIVATE).toBe(5);
  });
});
```

---

## Migration & Rollback Plan

### Data Migration (Already Complete)

✅ Migration `1763000000000-BundlePackagesMigration.ts` executed  
- Created `package_allowance` table
- Created `student_package_balance` table
- Removed `stripe_product_map.serviceType` column
- Removed `student_package.remainingSessions` column

### Rollback Strategy

If bundle packages cause issues in production:

1. **Disable new package creation**
   - Feature flag in admin UI
   - Existing bundles still work

2. **Revert to single-service packages**
   - Rollback migration (restore columns)
   - Redeploy previous service code

**Risk Level:** Medium (schema changes are reversible, services can rollback)

---

## Performance Considerations

### Query Optimization

**Eager Loading:**
```typescript
// Bad (N+1 queries)
const packages = await repo.find();
for (const pkg of packages) {
  await pkg.allowances; // Lazy load
}

// Good (single query)
const packages = await repo.find({
  relations: ['allowances', 'balances']
});
```

**Pessimistic Locking:**
```typescript
// Prevent race conditions on balance decrements
const balance = await repo
  .createQueryBuilder('balance')
  .where('balance.id = :id', { id: balanceId })
  .setLock('pessimistic_write')
  .getOne();
```

### Caching (Future Enhancement)

Consider Redis caching for:
- Active package listings (invalidate on create/update)
- Student balance totals (invalidate on use/refund)

---

## Related Documentation

- **Primary:** `../../bundle-packages-implementation-plan.md` (1300+ lines, comprehensive)
- **Checklist:** `../../phase4-implementation-checklist.md` (step-by-step guide)
- **Service Details:** `../../bundle-packages-service-refactoring.md`
- **Credit Tiers:** `../../credit-tiers-system.md`
- **ERD:** `../../course-programs-erd.md` (includes package_allowance schema)

## Files to Modify

**Backend:**
- `apps/nestjs/src/packages/packages.service.ts` (primary focus)
- `apps/nestjs/src/payments/payments.service.ts`
- `apps/nestjs/src/bookings/bookings.service.ts`
- `apps/nestjs/src/common/types/credit-tiers.ts`
- `packages/shared/src/types/packages.ts` (DTOs)

**Frontend (later):**
- `apps/wordpress/plugins/thrive-admin/src/components/PackagesAdmin.vue`
- `apps/wordpress/themes/custom-theme/blocks/student-class-credits/`

---

## Time Breakdown

- PackagesService refactoring: 5-6 days
- PaymentsService webhook update: 2 days
- BookingsService balance selection: 2 days
- Credit tiers utilities: 1 day
- Unit tests: 2 days
- Integration tests: 1 day
- E2E tests: 1 day
- Bug fixes & polish: 2-3 days

**Total:** 16-19 days (2.5-3 weeks)

---

## Definition of Done

- [ ] All 12 PackagesService methods refactored per checklist
- [ ] Webhook creates balances correctly
- [ ] Booking selects and decrements correct balance
- [ ] Cancellation refunds to correct balance
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E test for complete flow passes
- [ ] Pessimistic locking prevents race conditions
- [ ] Documentation updated (API docs, shared types)
- [ ] Can create and sell bundle packages in production

---

**Recommended Approach:** Follow `../../phase4-implementation-checklist.md` step-by-step. Test each method after refactoring before moving to the next.
