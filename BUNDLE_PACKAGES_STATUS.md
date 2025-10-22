# Bundle Packages Implementation Status

**Last Updated**: 2025-10-22
**Overall Progress**: ~30% Complete

## Summary

Implementation of bundle packages feature enabling students to purchase packages containing multiple service types (PRIVATE, GROUP, COURSE) with independent credit tracking per type.

## Architectural Decision: Single Source of Truth

**Key Decision**: PackageUse records are the authoritative source. Remaining credits are **computed** from:
```
remaining_credits = total_sessions - SUM(PackageUse.credits_used)
```

This eliminates denormalization and allows for materialized views later if performance becomes an issue.

---

## Completed Work

### ✅ Phase 1: Database Schema (100%)

**Migration File**: `apps/nestjs/src/migrations/1762000000010-BundlePackagesMigration.ts`

**Tables Created**:
- `package_allowance` - Defines what's included in each bundle
  - `stripe_product_map_id` (FK)
  - `service_type` (PRIVATE, GROUP, COURSE)
  - `teacher_tier` (0 = any)
  - `credits` (quantity)
  - `credit_unit_minutes` (15/30/45/60)

**Columns Modified**:
- Removed `service_type`, `teacher_tier` from `stripe_product_map`
- Removed `remaining_sessions` from `student_package`
- Added `service_type`, `credits_used` to `package_use`

**Migration Features**:
- ✓ Full up() and down() migration
- ✓ Data migration from old schema
- ✓ Backward compatible
- ✓ Rollback verified

### ✅ Phase 2: TypeORM Entities (100%)

**New Entities**:

1. **PackageAllowance** (`apps/nestjs/src/packages/entities/package-allowance.entity.ts`)
   - Represents one service type's allocation in a bundle
   - Relations: ManyToOne StripeProductMap

2. **Updated StudentPackage** (`apps/nestjs/src/packages/entities/student-package.entity.ts`)
   - Removed: `remainingSessions` column
   - Added: `uses` OneToMany relation to PackageUse (lazy loaded)
   - Balances computed from uses on-demand

3. **Updated StripeProductMap** (`apps/nestjs/src/payments/entities/stripe-product-map.entity.ts`)
   - Removed: `serviceType`, `teacherTier` columns
   - Added: `allowances` OneToMany relation (eager loaded)

4. **Updated PackageUse** (`apps/nestjs/src/packages/entities/package-use.entity.ts`)
   - Added: `serviceType` (tracks which balance was used)
   - Added: `creditsUsed` (can be > 1)

### ✅ Phase 3: DTOs & Types (100%)

**Updated File**: `packages/shared/src/types/packages.ts`

**New Types**:
- `PackageAllowanceSchema` - Defines one allowance
- Updated `CreatePackageSchema` - Now accepts `allowances` array
- Updated `PackageResponseSchema` - Returns `allowances` array
- Updated `CompatiblePackageSchema` - Includes `allowances`

**Key Changes**:
- ✓ Removed single `serviceType` → Now `allowances[]`
- ✓ Removed single `credits` → Now distributed in allowances
- ✓ Added `bundleDescription` (auto-generated or custom)
- ✓ Backward-compatible `StudentPackage` type (computed `remainingSessions`)

### ✅ Phase 4: Service Layer - Utilities (100%)

**New Utility Files**:

1. **bundle-helpers.ts** (`apps/nestjs/src/packages/utils/bundle-helpers.ts`)
   - `computeRemainingCredits()` - Aggregate PackageUse
   - `computeRemainingCreditsByServiceType()` - Filter by type, then aggregate
   - `generateBundleDescription()` - Auto-generate "5 Private (30min) + 3 Group"
   - `findAllowanceForServiceType()` - Find matching allowance
   - `bundleContainsServiceType()` - Check if bundle has type
   - `validateAllowances()` - Validate bundle configuration

2. **package-query-builder.ts** (`apps/nestjs/src/packages/utils/package-query-builder.ts`)
   - `buildPackageMappingQuery()` - Query with allowances
   - `buildActivePackageMappingQuery()` - With active filter
   - `buildPackagesForSessionTypeQuery()` - Filter by session type
   - `buildActiveStudentPackagesQuery()` - With uses loaded
   - `loadPackageUses()` - Async load for computation

---

## In Progress Work

### ⏳ Phase 4: Service Layer - PackagesService Methods (15%)

**Status**: Ready for implementation

**Completed Documentation**:
- `docs/bundle-packages-service-refactoring.md` - Detailed architecture and refactoring guide
- `docs/phase4-implementation-checklist.md` - Step-by-step implementation instructions

**Methods to Update** (in priority order):

1. **Simple Read Methods** (not started)
   - `getPackages()` - Load allowances, remove serviceType column refs
   - `getActivePackages()` - Same as above
   - `getValidPackagesForSession()` - Filter allowances by session type

2. **Helper Methods** (not started)
   - `buildPackageResponse()` - Build DTO from mapping + Stripe
   - `buildPackageResponses()` - Batch processing
   - `generateLookupKey()` - Update for allowances

3. **Write Methods** (not started)
   - `createPackage()` - Accept allowances array, create PackageAllowance rows
   - `usePackageForSession()` - Accept serviceType param, record in PackageUse

4. **Complex Methods** (not started)
   - `getActivePackagesForStudent()` - Compute remaining from uses
   - `getCompatiblePackagesForSession()` - Compute per service type, separate by tier

### ⏳ Phase 4.5: Other Services (not started)

- **PaymentsService**: Handle webhook, create uses from allowances
- **BookingsService**: Use balance computation, refund logic

---

## Not Yet Started

### ❌ Phase 5: API Controllers
- Update responses with new DTOs
- Handle allowances in requests

### ❌ Phase 6: WordPress Admin UI
- Bundle form with repeater for allowances
- Package list showing bundle summary

### ❌ Phase 7: WordPress Frontend Blocks
- Package selection displaying allowances
- Credits display showing breakdown by type
- Booking confirmation showing which balance used

### ❌ Phase 8: Testing
- Unit tests for helpers
- Integration tests for service methods
- E2E scenarios (multi-type purchase, refund, expiration)

### ❌ Phase 9: Data Migration & Rollout
- Pre-migration validation
- Staging environment testing
- Production backup & execution

### ❌ Phase 10: Documentation
- API docs
- Admin guide
- Customer-facing docs

---

## How to Continue

### Next Immediate Step

**Location**: `apps/nestjs/src/packages/packages.service.ts`

Follow the step-by-step guide in:
```
docs/phase4-implementation-checklist.md
```

This provides exact line numbers and code examples for:
1. Adding imports and dependencies (5 min)
2. Creating helper methods (10 min)
3. Updating each service method (2-3 min each)

### Build & Test

After each update:
```bash
npm run build:nestjs          # Should compile without errors
npm run test:nestjs           # Unit tests
npm run test:nestjs:e2e       # E2E tests (if available)
```

### Key Files Reference

| File | Purpose |
|------|---------|
| `docs/bundle-packages-implementation-plan.md` | Original high-level plan |
| `docs/bundle-packages-service-refactoring.md` | Detailed architecture |
| `docs/phase4-implementation-checklist.md` | Step-by-step instructions |
| `apps/nestjs/src/packages/utils/bundle-helpers.ts` | Utility functions |
| `apps/nestjs/src/packages/utils/package-query-builder.ts` | Query builders |
| `apps/nestjs/src/migrations/1762000000010-BundlePackagesMigration.ts` | Database schema |

---

## Design Principles

1. **Single Source of Truth**: PackageUse records only
2. **Computed Balances**: No denormalization, use SQL aggregation if needed later
3. **Backward Compatibility**: Old packages work as bundles with 1 allowance
4. **Flexible Tiers**: Support different tier requirements per service type
5. **Transaction Safety**: Pessimistic locking on package use

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Large refactoring | Step-by-step guide minimizes errors |
| Performance queries | Can add materialized views later |
| Data migration | Full migration with rollback tested |
| Backward compat | Type system enforces new structure |
| Race conditions | Pessimistic locking in usePackageForSession |

---

## Questions?

Refer to the implementation guides for detailed explanations of each change.

The codebase is designed for maintainability:
- Utilities are separated in `/utils/`
- Methods have clear docstring explanations
- Type system is strict with Zod validation
