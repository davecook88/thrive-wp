# Phase 4 Remaining Work

**Estimated Effort**: 2-3 hours
**Complexity**: Medium (type system and entity adjustments)

---

## Critical Path (Must Fix for Build)

### 1. Query Builder - IsNull() Usage
**File**: `apps/nestjs/src/packages/utils/package-query-builder.ts`
**Lines**: 98, 117
**Issue**: TypeORM `FindOptions` doesn't accept `null` for `deletedAt`, requires `IsNull()` operator

```typescript
// WRONG
where: {
  studentPackageId: packageId,
  deletedAt: null,  // ❌ Type mismatch
}

// RIGHT
where: {
  studentPackageId: packageId,
  deletedAt: IsNull(),  // ✅ Proper TypeORM usage
}
```

**Time**: 15 minutes

---

### 2. Booking Entity - packageUseId Property
**File**: `apps/nestjs/src/payments/entities/booking.entity.ts`
**Issue**: Need to add `packageUseId` column to link booking to package use

**Option A (Recommended)**: Add column to Booking entity
```typescript
@Column({ name: "package_use_id", type: "int", nullable: true })
packageUseId: number | null;

@ManyToOne(() => PackageUse)
@JoinColumn({ name: "package_use_id" })
packageUse: PackageUse | null;
```

**Option B**: Remove from BookingsService (if not needed)

**Time**: 20 minutes (including migration)

---

### 3. createAndBookSession() - remainingSessions References
**File**: `apps/nestjs/src/packages/packages.service.ts`
**Lines**: 477, 513, 516
**Issue**: Still using old column-based pattern

Need to refactor this method to:
1. Load package with uses
2. Compute remaining balance
3. Check if sufficient credits exist
4. Create PackageUse record instead of decrementing

**Similar to**: `usePackageForSession()` which was already refactored

**Time**: 30-45 minutes

---

### 4. Package AllowanceType Mismatch
**File**: `apps/nestjs/src/packages/packages.service.ts`
**Lines**: 87, 93
**Issue**: Entity `creditUnitMinutes` is `number`, schema expects `60 | 30 | 15 | 45`

**Solution**: Type assert or ensure validation
```typescript
// Add type assertion if value is already validated
generateBundleDescription(mapping.allowances as typeof mapping.allowances & PackageAllowance[])
```

Or fix at entity level to use specific union type.

**Time**: 15 minutes

---

### 5. PaymentsService - usePackageForSession() Call
**File**: `apps/nestjs/src/payments/payments.service.ts`
**Line**: 144
**Issue**: Still using old signature with 5 parameters

**Old**: `usePackageForSession(studentId, packageId, sessionId, usedBy, creditsCost)`
**New**: `usePackageForSession(studentId, packageId, sessionId, { usedBy, creditsUsed, serviceType })`

```typescript
// WRONG
const result = await this.packagesService.usePackageForSession(
  student.id,
  studentPackageId,
  sessionId,
  student.id,
  creditsCost,
);

// RIGHT
const result = await this.packagesService.usePackageForSession(
  student.id,
  studentPackageId,
  sessionId,
  {
    usedBy: student.id,
    creditsUsed: creditsCost,
    serviceType: session.type,
  }
);
```

**Time**: 15 minutes

---

### 6. Controller - usePackageForSession() Call
**File**: `apps/nestjs/src/packages/packages.controller.ts`
**Line**: 126
**Issue**: Passing `userIdNum` (a number) instead of options object

```typescript
// WRONG
const result = await this.packagesService.usePackageForSession(
  studentId,
  packageId,
  sessionId,
  userIdNum,  // ❌ Number instead of options
);

// RIGHT
const result = await this.packagesService.usePackageForSession(
  studentId,
  packageId,
  sessionId,
  {
    usedBy: userIdNum,
    creditsUsed: 1,  // or calculate from request
  }
);
```

**Time**: 10 minutes

---

### 7. getCompatiblePackagesForSession() - allowances Field
**File**: `apps/nestjs/src/packages/packages.service.ts`
**Lines**: 658, 659
**Issue**: Returns objects missing `allowances` array

Need to:
1. Load package mappings with allowances
2. Add allowances to each returned object

```typescript
const baseInfo = {
  id: pkg.id,
  label,
  remainingSessions: pkg.remainingSessions,
  expiresAt: pkg.expiresAt?.toISOString() || null,
  creditUnitMinutes,
  tier: packageTier,
  allowances: mapping.allowances || [],  // ✅ Add this
};
```

**Time**: 30 minutes (need to load mapping for each package)

---

### 8. getCompatiblePackagesForSession() - remainingSessions References
**File**: `apps/nestjs/src/packages/packages.service.ts`
**Lines**: 602, 637
**Issue**: Still using column-based balance approach

Need to refactor to compute remaining balance per service type (complex)

**Time**: 45-60 minutes

---

## Optional Enhancements (Can defer)

1. **Better Error Messages** - Add details about which service type can't be used
2. **Audit Logging** - Log all package use creations
3. **Metrics** - Track balance types used
4. **Caching** - Cache allowances by stripe product
5. **Validation** - Enhanced bundle structure validation

---

## Estimated Timeline

| Task | Time | Priority |
|------|------|----------|
| 1. IsNull() fix | 15m | CRITICAL |
| 2. Booking entity | 20m | CRITICAL |
| 3. createAndBookSession() | 45m | CRITICAL |
| 4. Type assertion | 15m | HIGH |
| 5. PaymentsService call | 15m | HIGH |
| 6. Controller call | 10m | HIGH |
| 7. allowances field | 30m | MEDIUM |
| 8. Refactor compatible | 60m | MEDIUM |
| **Total** | **3.5 hours** | |

---

## Build & Verification Steps

After each fix:
```bash
npm run build  # Verify compilation
npm run test:nestjs  # Run unit tests
```

Final verification:
```bash
npm run build          # Should pass
npm run test:nestjs    # Should pass
docker-compose up      # Manual testing
```

---

## Risk Factors

1. **Type System Complexity** - PackageAllowance union types can be tricky
2. **Query Performance** - Loading mappings with allowances repeatedly could be slow
3. **Backward Compatibility** - Need to ensure old single-service packages still work
4. **Concurrency** - Package use creation under race conditions

---

## Success Criteria

- ✅ Build completes without errors
- ✅ All unit tests pass
- ✅ createBooking() flow works end-to-end
- ✅ usePackageForSession() returns correct balances
- ✅ getCompatiblePackagesForSession() includes allowances
- ✅ Cross-service-type bundles work correctly

