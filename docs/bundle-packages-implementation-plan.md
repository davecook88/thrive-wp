# Bundle Packages Implementation Plan

**Status:** In Progress (Phases 1-3 Complete, Phase 4 In Progress)
**Created:** 2025-10-22
**Last Updated:** 2025-10-22
**Current Phase:** 4 - Service Layer Refactoring
**Overall Progress:** ~30% Complete
**Scope:** Support package bundles containing PRIVATE, GROUP, and COURSE session credits with different allowances per type

> **Quick Reference**: See `docs/phase4-implementation-checklist.md` for step-by-step implementation instructions and `BUNDLE_PACKAGES_STATUS.md` for current progress.

## Architectural Decision

**Single Source of Truth**: PackageUse is authoritative. Balances are computed:
```
remaining_credits = total_sessions - SUM(PackageUse.credits_used WHERE service_type = ?)
```

This eliminates denormalization and keeps one source of truth.

---

## Executive Summary

This document outlines the implementation of **bundle packages** - a major feature allowing packages to include multiple service types (PRIVATE, GROUP, COURSE) each with independent allowances for credits, credit duration, and teacher tier restrictions.

### Current State
- Packages are single-service-type (one service_type per package)
- Package-level metadata stores service details
- Single `remaining_sessions` counter per purchased package

### Target State
- Packages are bundles containing multiple service type allowances
- Each allowance has independent: credits, credit_unit_minutes, teacher_tier
- Multiple balance tracks per purchased package (one per service type)
- Single Stripe product per bundle
- Custom bundle name + auto-generated description

### Key Decisions
- ✅ Single Stripe product per bundle (not separate line items)
- ✅ Track balances separately by service type
- ✅ Migrate all existing packages to new structure
- ✅ Support different credit durations per service type
- ✅ Support different teacher tiers per service type
- ✅ Custom bundle name + auto-generated description option

---

## Phase 1: Database Schema Changes

### 1.1 Create `package_allowance` Table

New table defining what's included in each bundle package.

```sql
CREATE TABLE package_allowance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stripe_product_map_id INT NOT NULL,
  service_type ENUM('PRIVATE', 'GROUP', 'COURSE') NOT NULL,
  teacher_tier INT NOT NULL DEFAULT 0 COMMENT 'Teacher tier restriction (0 = any)',
  credits INT NOT NULL COMMENT 'Number of credits of this type in bundle',
  credit_unit_minutes INT NOT NULL COMMENT 'Duration per credit: 15, 30, 45, or 60',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  INDEX IDX_stripe_product_map_id (stripe_product_map_id),
  INDEX IDX_service_type (service_type),
  CONSTRAINT fk_allowance_product FOREIGN KEY (stripe_product_map_id)
    REFERENCES stripe_product_map(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

**Purpose:** Defines bundle contents - each row represents one service type allowance.

**Checklist:**
- [ ] Review migration impact on Stripe product metadata
- [ ] Verify indexes are correct for query patterns
- [ ] Add constraint to ensure credits > 0
- [ ] Add constraint to ensure credit_unit_minutes in (15, 30, 45, 60)
- [ ] Create migration file: `AddPackageAllowanceTable.ts`

---

### 1.2 Create `student_package_balance` Table

New table tracking remaining credits per service type for purchased packages.

```sql
CREATE TABLE student_package_balance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_package_id INT NOT NULL,
  service_type ENUM('PRIVATE', 'GROUP', 'COURSE') NOT NULL,
  teacher_tier INT NOT NULL DEFAULT 0,
  credit_unit_minutes INT NOT NULL,
  total_credits INT NOT NULL COMMENT 'Total credits purchased for this type',
  remaining_credits INT NOT NULL COMMENT 'Credits not yet used',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  INDEX IDX_student_package_id (student_package_id),
  INDEX IDX_service_type (service_type),
  CONSTRAINT fk_balance_package FOREIGN KEY (student_package_id)
    REFERENCES student_package(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

**Purpose:** Tracks remaining balance per service type for each purchased package.

**Checklist:**
- [ ] Verify cascade delete behavior
- [ ] Add constraint remaining_credits >= 0
- [ ] Add constraint total_credits > 0
- [ ] Test balance creation in webhook handling
- [ ] Create migration file: `AddStudentPackageBalanceTable.ts`

---

### 1.3 Modify `stripe_product_map` Table

Remove service type columns (moved to package_allowance).

```sql
ALTER TABLE stripe_product_map DROP COLUMN service_type;
ALTER TABLE stripe_product_map DROP COLUMN teacher_tier;
```

**Changes:**
- Remove `service_type` ENUM column
- Remove `teacher_tier` INT column
- Drop associated indexes

**Checklist:**
- [ ] Backup existing data first
- [ ] Create migration with data preservation
- [ ] Verify no code still references removed columns
- [ ] Include in migration: `ModifyStripeProductMapRemoveServiceColumns.ts`

---

### 1.4 Modify `student_package` Table

Remove remaining_sessions column (moved to student_package_balance).

```sql
ALTER TABLE student_package DROP COLUMN remaining_sessions;
```

**Changes:**
- Remove `remaining_sessions` INT column
- Keep `total_sessions` for backward reference
- Metadata still contains snapshot of allowances at purchase time

**Checklist:**
- [ ] Backup existing data first
- [ ] Migrate remaining_sessions → student_package_balance.remaining_credits
- [ ] Verify queries no longer select remaining_sessions
- [ ] Include in migration: `ModifyStudentPackageRemoveRemainingSessionsColumn.ts`

---

### 1.5 Modify `package_use` Table

Add tracking of which service type and how many credits were used.

```sql
ALTER TABLE package_use
  ADD COLUMN service_type ENUM('PRIVATE', 'GROUP', 'COURSE') NULL,
  ADD COLUMN credits_used INT NOT NULL DEFAULT 1;
```

**Changes:**
- Add `service_type` to track which balance was used
- Add `credits_used` to track multi-credit usage

**Checklist:**
- [ ] Make service_type nullable for backward compat initially
- [ ] Set default credits_used = 1 (typical case)
- [ ] Include in migration: `ModifyPackageUseAddServiceColumns.ts`

---

### 1.6 Migration Execution

**File:** `apps/nestjs/src/migrations/{timestamp}-BundlePackagesMigration.ts`

**Execution order:**
1. Create `package_allowance` table
2. Create `student_package_balance` table
3. Modify `stripe_product_map` - migrate data then drop columns
4. Modify `student_package` - migrate data then drop columns
5. Modify `package_use` - add columns

**Checklist:**
- [ ] Write comprehensive migration with data transformation
- [ ] Include up() with all steps
- [ ] Include down() to rollback completely
- [ ] Test migration on copy of production database
- [ ] Verify row counts after migration
- [ ] Document any manual data fixes needed

---

## Phase 2: TypeORM Entities

### 2.1 Create `PackageAllowance` Entity

**File:** `apps/nestjs/src/packages/entities/package-allowance.entity.ts`

```typescript
@Entity("package_allowance")
@Index(["stripeProductMapId"])
@Index(["serviceType"])
export class PackageAllowance extends BaseEntity {
  @Column()
  stripeProductMapId: number;

  @ManyToOne(() => StripeProductMap, pm => pm.allowances, { onDelete: "CASCADE" })
  @JoinColumn({ name: "stripe_product_map_id" })
  stripeProductMap: StripeProductMap;

  @Column({ type: "enum", enum: ServiceType })
  serviceType: ServiceType;

  @Column({ type: "int", default: 0 })
  teacherTier: number;

  @Column({ type: "int" })
  credits: number;

  @Column({ type: "int" })
  creditUnitMinutes: number;
}
```

**Checklist:**
- [ ] Create file with proper imports
- [ ] Add all decorators (Entity, Index, ManyToOne, Column)
- [ ] Verify relation to StripeProductMap
- [ ] Add validation constraints
- [ ] Register in AppModule
- [ ] Add to migration file's data sources

---

### 2.2 Create `StudentPackageBalance` Entity

**File:** `apps/nestjs/src/packages/entities/student-package-balance.entity.ts`

```typescript
@Entity("student_package_balance")
@Index(["studentPackageId"])
@Index(["serviceType"])
export class StudentPackageBalance extends BaseEntity {
  @Column()
  studentPackageId: number;

  @ManyToOne(() => StudentPackage, sp => sp.balances, { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_package_id" })
  studentPackage: StudentPackage;

  @Column({ type: "enum", enum: ServiceType })
  serviceType: ServiceType;

  @Column({ type: "int", default: 0 })
  teacherTier: number;

  @Column({ type: "int" })
  creditUnitMinutes: number;

  @Column({ type: "int" })
  totalCredits: number;

  @Column({ type: "int" })
  remainingCredits: number;
}
```

**Checklist:**
- [ ] Create file with proper imports
- [ ] Add all decorators
- [ ] Verify relation to StudentPackage
- [ ] Add validation constraints
- [ ] Register in AppModule
- [ ] Add to migration file's data sources

---

### 2.3 Update `StripeProductMap` Entity

**File:** `apps/nestjs/src/payments/entities/stripe-product-map.entity.ts`

**Changes:**
```typescript
// REMOVE:
// serviceType property
// teacherTier property

// ADD:
@OneToMany(() => PackageAllowance, allowance => allowance.stripeProductMap, { eager: true })
allowances: PackageAllowance[];
```

**Checklist:**
- [ ] Remove serviceType column property
- [ ] Remove teacherTier column property
- [ ] Add allowances OneToMany relation
- [ ] Set eager loading if needed for performance
- [ ] Verify all references updated in services
- [ ] Update DTOs to use allowances

---

### 2.4 Update `StudentPackage` Entity

**File:** `apps/nestjs/src/packages/entities/student-package.entity.ts`

**Changes:**
```typescript
// REMOVE:
// remainingSessions property

// ADD:
@OneToMany(() => StudentPackageBalance, balance => balance.studentPackage, { eager: true })
balances: StudentPackageBalance[];
```

**Checklist:**
- [ ] Remove remainingSessions column property
- [ ] Add balances OneToMany relation
- [ ] Set eager loading for student package fetches
- [ ] Verify metadata still contains snapshot
- [ ] Update queries to load balances relation
- [ ] Add helper method: getTotalRemainingCredits()

---

### 2.5 Update `PackageUse` Entity

**File:** `apps/nestjs/src/packages/entities/package-use.entity.ts`

**Changes:**
```typescript
// ADD:
@Column({ type: "enum", enum: ServiceType, nullable: true })
serviceType?: ServiceType;

@Column({ type: "int", default: 1 })
creditsUsed: number;
```

**Checklist:**
- [ ] Add serviceType column (nullable for backward compat)
- [ ] Add creditsUsed column with default 1
- [ ] Verify usage in packages service
- [ ] Make nullable initially, backfill during migration

---

## Phase 3: DTOs & Type Definitions

### 3.1 Update Shared Package Types

**File:** `packages/shared/src/types/packages.ts`

**Create `PackageAllowanceDto`:**
```typescript
z.object({
  serviceType: z.nativeEnum(ServiceType),
  teacherTier: z.number().int().nonnegative().default(0),
  credits: z.number().int().positive(),
  creditUnitMinutes: z.union([
    z.literal(15), z.literal(30), z.literal(45), z.literal(60)
  ])
})
```

**Update `CreatePackageSchema`:**
```typescript
z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),

  // NEW: Array of allowances (bundle contents)
  allowances: z.array(PackageAllowanceSchema).min(1),

  // REMOVED: serviceType, credits, creditUnitMinutes, teacherTier

  expiresInDays: z.number().int().positive().nullable().optional(),
  bundleDescription: z.string().optional(), // auto-generated if not provided
  currency: z.string().length(3).default("USD"),
  amountMinor: z.number().int().positive(),
  lookupKey: z.string().optional(),
  scope: z.string().default("global"),
})
```

**Update `PackageResponseSchema`:**
```typescript
z.object({
  id: z.number(),
  name: z.string(),
  bundleDescription: z.string(),
  allowances: z.array(PackageAllowanceSchema),
  expiresInDays: z.number().nullable().optional(),
  stripe: z.object({
    productId: z.string(),
    priceId: z.string(),
    lookupKey: z.string(),
    unitAmount: z.number(),
    currency: z.string(),
  }),
  active: z.boolean(),
})
```

**Create `StudentPackageBalanceDto`:**
```typescript
z.object({
  serviceType: z.nativeEnum(ServiceType),
  teacherTier: z.number(),
  creditUnitMinutes: z.number(),
  totalCredits: z.number(),
  remainingCredits: z.number(),
})
```

**Update student package response to use balances:**
```typescript
z.object({
  // ... existing fields
  balances: z.array(StudentPackageBalanceSchema),
  // REMOVE: remainingSessions
  // ADD: totalRemainingByType: Record<ServiceType, number>
})
```

**Checklist:**
- [ ] Create allowance DTO/schema
- [ ] Update CreatePackageSchema with allowances array
- [ ] Remove old serviceType/credits/etc from create DTO
- [ ] Update PackageResponseSchema
- [ ] Create balance DTO/schema
- [ ] Update student package response types
- [ ] Update shared types file
- [ ] Export new types from index
- [ ] Validate schema constraints (min 1 allowance, positive credits, etc)

---

### 3.2 Update Admin Package Schemas

**File:** `apps/wordpress/plugins/thrive-admin/src/lib/schemas/packages.ts`

Update to match new bundle structure.

**Checklist:**
- [ ] Update form schema for bundle inputs
- [ ] Add allowances array field to form
- [ ] Remove old single serviceType field
- [ ] Add bundleDescription field
- [ ] Update validation rules
- [ ] Sync with shared types

---

## Phase 4: Service Layer Implementation

### 4.1 Update `PackagesService`

**File:** `apps/nestjs/src/packages/packages.service.ts`

#### Method: `createPackage(dto)`
Lines 384-488

**Changes:**
- Accept allowances array instead of single serviceType
- Loop through allowances to validate
- Create Stripe product for ENTIRE bundle (not per service type)
- Store allowances in Stripe metadata
- Create one stripe_product_map entry
- Create multiple package_allowance entries (one per allowance)
- Generate bundleDescription if not provided

**Checklist:**
- [ ] Update to loop through allowances array
- [ ] Validate each allowance
- [ ] Create single Stripe product
- [ ] Store allowances in metadata: `{ allowances: [...] }`
- [ ] Create package_allowance rows via repository
- [ ] Generate auto description: "5 Private (30min) + 3 Group (60min) + 2 Course"
- [ ] Return updated response with allowances
- [ ] Test with single and multiple allowances
- [ ] Handle Stripe metadata size limits

#### Method: `getPackages()` / `getActivePackages()`
Lines 65-195

**Changes:**
- Load allowances relation from stripe_product_map
- Build response with allowances array
- Include bundleDescription

**Checklist:**
- [ ] Add allowances to QueryBuilder eager load
- [ ] Return allowances in PackageResponseDto
- [ ] Include bundleDescription in response
- [ ] Handle packages without allowances gracefully

#### Method: `getValidPackagesForSession(sessionId)`
Lines 197-287

**Changes:**
- Query allowances that match session serviceType
- Join through stripe_product_map
- Check tier compatibility per allowance
- Return bundles that contain compatible allowances

**Checklist:**
- [ ] Query package_allowance filtered by service_type
- [ ] Join back to stripe_product_map
- [ ] Get bundles (stripe_product_map) that have matching allowances
- [ ] Filter by active status
- [ ] Include tier validation
- [ ] Return complete package objects with allowances

#### Method: `getCompatiblePackagesForSession(studentId, sessionId)`
Lines 696-800

**Changes:**
- Load packages with balances relation
- For each balance, check if compatible with session
- Return exact matches and higher-tier separately
- Select recommended by balance (not package)

**Checklist:**
- [ ] Load balances relation for each package
- [ ] For each balance, call canUseBalanceForSession()
- [ ] Group into exactMatch and higherTier arrays
- [ ] Update recommendation logic to select by balance
- [ ] Return balance details in response
- [ ] Test with multi-type bundles

#### Method: `usePackageForSession()`
Lines 538-584

**Changes:**
- Parameter: accept balance ID or find compatible balance
- Lock specific balance row (not package)
- Decrement remainingCredits (not remainingSessions)
- Create PackageUse with serviceType
- Return balance instead of package

**Checklist:**
- [ ] Accept studentId, balanceId, sessionId, creditsUsed
- [ ] Load balance with pessimistic lock
- [ ] Validate balance.remainingCredits >= creditsUsed
- [ ] Validate balance not expired
- [ ] Decrement balance.remainingCredits
- [ ] Create PackageUse with serviceType
- [ ] Set creditsUsed correctly
- [ ] Return balance object
- [ ] Test pessimistic locking

#### Method: `getActivePackagesForStudent(studentId)`
Lines 491-536

**Changes:**
- Load packages with balances relation
- Filter packages and balances by expiration
- Return balances array per package
- Calculate totalRemainingByType

**Checklist:**
- [ ] Load balances eager
- [ ] Filter active packages (has unexpired balances)
- [ ] Return balances array
- [ ] Calculate totalRemainingByType across all balances
- [ ] Include balance metadata in response
- [ ] Test with expired and active balances mixed

**Checklist (Overall PackagesService):**
- [ ] Update all method signatures
- [ ] Update repository queries to use allowances/balances
- [ ] Update response building logic
- [ ] Add new helper methods for balance operations
- [ ] Update logging to reference balances
- [ ] Test all methods with new structure

---

### 4.2 Update `PaymentsService`

**File:** `apps/nestjs/src/payments/payments.service.ts`

#### Method: `handlePackagePurchase()`
Lines 407-602

**Changes:**
- Parse allowances array from Stripe metadata
- Create StudentPackage record (unchanged)
- Create StudentPackageBalance row for EACH allowance
- If immediate booking: find compatible balance and decrement

**Checklist:**
- [ ] Parse allowances from stripeProduct.metadata
- [ ] Create StudentPackage (single row)
- [ ] Loop through allowances
- [ ] Create StudentPackageBalance for each (credits, creditUnitMinutes, serviceType, teacherTier)
- [ ] If sessionId: find compatible balance
- [ ] Decrement compatible balance.remainingCredits
- [ ] Create PackageUse with serviceType and creditsUsed
- [ ] Test webhook with multi-allowance product

#### Method: `bookWithPackage()`
Lines 84-168

**Changes:**
- Load package with balances
- Find compatible balance using new logic
- Call usePackageForSession with balance
- Include balance info in response

**Checklist:**
- [ ] Load balances relation
- [ ] Find compatible balance for session
- [ ] Call packagesService.usePackageForSession(student.id, balanceId, ...)
- [ ] Include balance info in response
- [ ] Handle case where no compatible balance exists
- [ ] Test with bundle containing session type

---

### 4.3 Update `BookingsService`

**File:** `apps/nestjs/src/bookings/bookings.service.ts`

#### Method: `createBooking()`
Lines 60-161

**Changes:**
- Load package with balances
- Find compatible balance for session
- Use balance-specific validation
- Decrement balance instead of package

**Checklist:**
- [ ] Load balances relation
- [ ] Find compatible balance
- [ ] Validate balance.remainingCredits >= creditsCost
- [ ] Validate balance not expired
- [ ] Call packagesService.usePackageForSession
- [ ] Update booking with balance info
- [ ] Test with bundle packages

#### Method: `cancelBooking()`
Lines 273-348

**Changes:**
- Look up which balance was used (via packageUse.serviceType)
- Refund to correct balance
- Increment correct balance.remainingCredits

**Checklist:**
- [ ] Load booking with packageUse relation
- [ ] Get serviceType from packageUse
- [ ] Find balance by (packageId, serviceType)
- [ ] Increment balance.remainingCredits
- [ ] Create refund log
- [ ] Test refunding multi-type bundles

---

### 4.4 Update Credit Tiers Utilities

**File:** `apps/nestjs/src/common/types/credit-tiers.ts`

**New function: `canUseBalanceForSession(balance, session)`**
```typescript
export function canUseBalanceForSession(
  balance: StudentPackageBalance,
  session: Session
): boolean {
  // Service type must match
  // Tier validation
  // Not expired
}
```

**New function: `findCompatibleBalances(balances, session)`**
```typescript
export function findCompatibleBalances(
  balances: StudentPackageBalance[],
  session: Session
): { exactMatch: StudentPackageBalance[], higherTier: StudentPackageBalance[] }
```

**Update existing functions:**
- Keep `canUsePackageForSession()` for backward compat (calls balance check)
- Update `getPackageDisplayLabel()` for bundles
- Add `getPackageBundleDescription()` helper

**Checklist:**
- [ ] Create canUseBalanceForSession()
- [ ] Create findCompatibleBalances()
- [ ] Update existing functions to work with balances
- [ ] Add balance tier calculation helpers
- [ ] Test all tier scenarios
- [ ] Update tests for new functions

---

## Phase 5: API Updates

### 5.1 Update `PackagesController`

**File:** `apps/nestjs/src/packages/packages.controller.ts`

#### Endpoint: `GET /api/packages?sessionId=123`
- Query for valid packages for session
- Load all allowances
- Return packages with allowances array

#### Endpoint: `GET /api/packages/my-credits`
- Load student's packages with balances
- Group balances by type
- Return breakdown per service type

#### Endpoint: `GET /api/packages/compatible-for-session/:sessionId`
- Find compatible balances (not just packages)
- Return balance details (remainingCredits, service_type, etc)
- Separate exact matches from higher-tier

#### Endpoint: `POST /api/packages/:id/use`
- Accept optional `serviceType` or `balanceId`
- Find compatible balance if not specified
- Call usePackageForSession
- Return balance after use

**Checklist:**
- [ ] Update all endpoint responses with new DTOs
- [ ] Add serviceType optional param for use endpoint
- [ ] Return balance data in responses
- [ ] Test all endpoints with bundles
- [ ] Update API documentation

---

### 5.2 Update `AdminPackagesController`

**File:** `apps/nestjs/src/packages/admin-packages.controller.ts`

#### Endpoint: `POST /admin/packages`
- Accept new CreatePackageDto with allowances
- Call packagesService.createPackage

#### Endpoint: `GET /admin/packages`
- Return packages with allowances

#### Endpoint: `GET /admin/packages/:id`
- Load package with allowances

**Checklist:**
- [ ] Validate CreatePackageDto schema
- [ ] Test bundle creation
- [ ] Test list with allowances
- [ ] Test get with allowances

---

## Phase 6: WordPress Admin UI

### 6.1 Update `PackagesAdmin.vue`

**File:** `apps/wordpress/plugins/thrive-admin/src/components/PackagesAdmin.vue`

#### Create Form Updates:

**Bundle Info Section:**
- Package name input (custom)
- Bundle description input (optional)
- Preview of auto-generated description
- Expiration days input
- Currency selector
- Total price input

**Allowances Section (Repeater):**
- Add "Add Allowance" button
- For each allowance:
  - Service Type dropdown (PRIVATE/GROUP/COURSE)
  - Teacher Tier input (0 = any, or specific tier)
  - Credits count input
  - Credit Unit Minutes dropdown (15/30/45/60)
  - Remove button
- Minimum 1 allowance required

**Preview Section:**
- Show what customer will see
- Display: "5 Private Credits (30 min each) + 3 Group Credits (60 min each)"
- Show total monthly/expiration

**Checklist:**
- [ ] Update form schema
- [ ] Add allowances array form group
- [ ] Update validation
- [ ] Add repeater component for allowances
- [ ] Implement auto-description generation
- [ ] Update form submission to new DTO
- [ ] Test form with single and multiple allowances
- [ ] Test validation

#### List Display Updates:
- Show bundle name prominently
- Show allowances summary: "5 Private + 3 Group + 2 Course"
- Show active/inactive status
- Show creation date
- Show link to Stripe product
- Show deactivate button

**Checklist:**
- [ ] Update package list display
- [ ] Show allowances summary
- [ ] Update layout for bundle info
- [ ] Test with various bundles
- [ ] Responsive design

---

## Phase 7: WordPress Frontend

### 7.1 Update Package Selection Block

**File:** `apps/wordpress/themes/custom-theme/blocks/package-selection/`

**Display Updates:**
- Show bundle name prominently
- List all allowances:
  - "5 Private Sessions (30 min each)"
  - "3 Group Sessions (60 min each)"
  - "2 Course Credits"
- Show total price
- Show expiration if applicable
- Highlight if bundle contains what user needs for current session

**Selection Logic:**
- When user selects a bundle, validate it has compatible allowance
- Show which allowance will be used for current session type
- Store selected bundle ID

**Checklist:**
- [ ] Update block template to show allowances
- [ ] Add allowance list rendering
- [ ] Update compatibility checking
- [ ] Add preview of what will be used
- [ ] Test with various bundles
- [ ] Test responsive layout

---

### 7.2 Update Student Credits Display Block

**File:** `apps/wordpress/themes/custom-theme/blocks/student-package-details/`

**Display Updates:**
- Show each purchased package
- For each package:
  - Package name
  - Purchased date
  - Expiration date
  - **Balances breakdown:**
    - "Private Credits: 3 remaining (30 min each)"
    - "Group Credits: 2 remaining (60 min each)"
    - "Course Credits: 1 remaining"
  - Total remaining hours/minutes
  - Days until expiration

**Balance Tracking:**
- Show remaining by service type
- Highlight low balances (< 2 credits)
- Show expiration warnings

**Checklist:**
- [ ] Update block to fetch balances
- [ ] Show balance breakdown per type
- [ ] Update calculations for total remaining
- [ ] Add expiration indicators
- [ ] Test with various balance combinations
- [ ] Responsive layout

---

### 7.3 Update Booking Confirmation Flow

**File:** `apps/wordpress/themes/custom-theme/blocks/selected-event-modal/`

**Updates:**
- When showing compatible packages for a session
- Show which balance will be used
- Display: "3 Private Credits Remaining (30 min each)"
- Show impact on balance after booking
- Warn if this is the last balance of that type

**Checklist:**
- [ ] Load compatible balances (not just packages)
- [ ] Show balance details clearly
- [ ] Preview post-booking balance
- [ ] Add warnings for low balances
- [ ] Test with bundle packages
- [ ] Test with different session types

---

## Phase 8: Testing

### 8.1 Update Existing Tests

#### `packages.service.spec.ts`
- [ ] Update all tests for bundle structure
- [ ] Test createPackage with allowances array
- [ ] Test getPackages loads allowances
- [ ] Test getValidPackagesForSession finds bundles with matching allowances
- [ ] Test getCompatiblePackagesForSession returns balances
- [ ] Test usePackageForSession decrements balance
- [ ] Test getActivePackagesForStudent returns balances

#### `package-booking.e2e.spec.ts`
- [ ] Update booking flow tests for balances
- [ ] Test booking with bundle package
- [ ] Test selecting specific balance by type
- [ ] Test cancellation refunds to correct balance
- [ ] Test cross-type booking scenarios

#### `credit-tiers.spec.ts`
- [ ] Update balance validation tests
- [ ] Test canUseBalanceForSession
- [ ] Test findCompatibleBalances
- [ ] Test tier calculations with balances

#### `payments.service.spec.ts`
- [ ] Update webhook tests for multi-allowance
- [ ] Test handlePackagePurchase creates balances
- [ ] Test bookWithPackage finds compatible balance

#### `bookings.service.spec.ts`
- [ ] Update createBooking tests
- [ ] Test balance selection
- [ ] Update cancelBooking tests for balance refunds

---

### 8.2 New Bundle Tests

**File:** `packages/packages-bundle.spec.ts`

#### Bundle Creation Tests:
```
[ ] Single allowance bundle (backward compat)
[ ] Multi-allowance bundle (PRIVATE + GROUP)
[ ] Three-type bundle (PRIVATE + GROUP + COURSE)
[ ] Different credit durations per type
[ ] Different teacher tiers per type
[ ] Auto-generated description
[ ] Custom description override
[ ] Validation: at least 1 allowance
[ ] Validation: positive credits
[ ] Validation: valid credit_unit_minutes
[ ] Stripe product created correctly
```

#### Bundle Usage Tests:
```
[ ] Select correct balance for session type
[ ] Prevent using private balance for group session
[ ] Allow higher-tier balance for lower-tier session
[ ] Deny insufficient balance (too few credits)
[ ] Deny expired balance
[ ] Calculate credits correctly (different durations)
```

#### Bundle Balance Tests:
```
[ ] Create balances for each allowance on purchase
[ ] Track remaining per type independently
[ ] Refund to correct balance on cancellation
[ ] Show remaining breakdown correctly
[ ] Handle depleted balance (0 remaining)
```

#### Bundle Display Tests:
```
[ ] Display package with allowances
[ ] Show bundle description
[ ] Show balance breakdown by type
[ ] Highlight which balance will be used
[ ] Warn on low balance
```

---

### 8.3 E2E Test Scenarios

#### Scenario 1: Create and Use Bundle
```
[ ] Admin creates 3-type bundle
[ ] Student purchases bundle
[ ] Student books private session (uses private balance)
[ ] Student books group session (uses group balance)
[ ] Verify balances updated correctly
[ ] Cancel one booking, verify refund to correct balance
```

#### Scenario 2: Mixed Expiration
```
[ ] Bundle with different expiration dates per allowance
[ ] Some balances expired, others active
[ ] Can only use active balances
[ ] Show expired vs active clearly
```

#### Scenario 3: Tier Variations
```
[ ] Bundle with different teacher tiers
[ ] Premium teacher requires higher-tier balance
[ ] Cross-tier booking with confirmation
[ ] Correct balance selection based on tier
```

---

## Phase 9: Data Migration & Rollout

### 9.1 Pre-Migration

**Checklist:**
- [ ] Create comprehensive backup of production database
- [ ] Test migration on copy of production database
- [ ] Run migration on staging environment
- [ ] Verify data integrity:
  - [ ] All packages have allowances
  - [ ] All purchased packages have balances
  - [ ] Balances match old remaining_sessions
  - [ ] Service types preserved correctly
  - [ ] Teacher tiers preserved correctly
- [ ] Performance test: query allowances/balances
- [ ] Rollback test: verify down() migration works
- [ ] Document any manual data fixes needed

---

### 9.2 Code Deployment

**Checklist:**
- [ ] All Phase 1-7 changes merged to main
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Staging environment tested
- [ ] Deployment prepared

---

### 9.3 Migration Execution

**Production Steps:**
1. [ ] Backup production database
2. [ ] Deploy new code
3. [ ] Run migration in maintenance window
4. [ ] Verify migration logs
5. [ ] Check row counts match expectations:
   - package_allowance rows ≥ old stripe_product_map rows
   - student_package_balance rows ≥ old student_package rows
6. [ ] Test key flows:
   - [ ] Create new bundle package
   - [ ] Purchase package
   - [ ] Book session with package
   - [ ] Cancel booking / refund
   - [ ] Check student credits display
7. [ ] Monitor logs for errors
8. [ ] Notify users if needed

---

### 9.4 Post-Migration Validation

**Functional Tests:**
- [ ] Create package with single allowance
- [ ] Create package with multiple allowances
- [ ] Purchase package via webhook
- [ ] Book with package credits
- [ ] Check balance display
- [ ] Cancel booking and refund
- [ ] Verify tier validation
- [ ] Verify expiration handling
- [ ] Verify pessimistic locking

**Data Validation:**
- [ ] Run SQL validation queries
- [ ] Verify no NULL balances remain
- [ ] Verify sum of balances matches total_sessions
- [ ] Check for orphaned records
- [ ] Verify no deleted_at inconsistencies

**Performance Validation:**
- [ ] Query allowances: < 100ms
- [ ] Query balances: < 100ms
- [ ] Load package with allowances: < 200ms
- [ ] Create balance on webhook: < 500ms

---

### 9.5 Rollback Plan

If issues occur post-migration:

1. [ ] Identify issue severity
2. [ ] For recoverable issues:
   - [ ] Deploy fix
   - [ ] Run additional migration if needed
   - [ ] Test and re-validate
3. [ ] For critical issues:
   - [ ] Restore database backup
   - [ ] Revert code to previous version
   - [ ] Investigate issue thoroughly
   - [ ] Fix and re-test
   - [ ] Reschedule migration

**Checklist for rollback:**
- [ ] Quick revert procedure documented
- [ ] Backup accessible and verified
- [ ] Rollback tested in staging
- [ ] Communication plan ready

---

## Phase 10: Documentation

### 10.1 Technical Documentation

#### `docs/package-metadata.md`
- [ ] Document bundle structure
- [ ] Show metadata schema for Stripe product
- [ ] Explain allowances array
- [ ] Give examples

#### `docs/credit-tiers-system.md`
- [ ] Update for balance-based validation
- [ ] Document canUseBalanceForSession logic
- [ ] Show tier calculation examples
- [ ] Explain cross-tier bookings

#### `docs/student-package-lifecycle.md` (NEW)
- [ ] Create document explaining:
  - [ ] Package purchase → creates balances
  - [ ] Balance decrement on booking
  - [ ] Balance refund on cancellation
  - [ ] Expiration handling
  - [ ] Edge cases

#### `.github/instructions/nestjs.instructions.md`
- [ ] Document bundle package patterns
- [ ] Show service implementation examples
- [ ] Explain migration to new system

---

### 10.2 API Documentation

**Checklist:**
- [ ] Update API docs with new endpoints/responses
- [ ] Document new DTOs:
  - [ ] CreatePackageDto with allowances
  - [ ] PackageResponseDto with allowances
  - [ ] StudentPackageBalanceDto
- [ ] Show request/response examples:
  - [ ] Create bundle
  - [ ] Get packages
  - [ ] Get compatible packages
  - [ ] Purchase package
  - [ ] Book with package
- [ ] Document error scenarios

---

### 10.3 Admin User Guide

**Checklist:**
- [ ] Create guide for creating bundles
- [ ] Screenshots of new form
- [ ] Examples of common bundles:
  - [ ] Single service type (backward compat)
  - [ ] Private + Group combo
  - [ ] Full package (all 3 types)
- [ ] Explain auto-generated descriptions
- [ ] Show student package breakdown view
- [ ] Pricing/discount guidelines

---

## Implementation Checklist

### Phase 1: Database (Est. 2-3 hours)
- [ ] Design schema finalized
- [ ] Migration file created
- [ ] Migration tested on staging
- [ ] Rollback verified
- [ ] Constraints documented

### Phase 2: Entities (Est. 2 hours)
- [ ] All 5 entities created/updated
- [ ] Relations configured
- [ ] Validation added
- [ ] Registered in AppModule
- [ ] Compiled without errors

### Phase 3: DTOs (Est. 2 hours)
- [ ] All schemas updated
- [ ] Types exported
- [ ] Validation tested
- [ ] Admin forms updated
- [ ] No type errors

### Phase 4: Services (Est. 8-10 hours)
- [ ] PackagesService refactored
- [ ] PaymentsService updated
- [ ] BookingsService updated
- [ ] Credit tiers updated
- [ ] All methods tested
- [ ] Logging updated

### Phase 5: APIs (Est. 3 hours)
- [ ] Controller endpoints updated
- [ ] Response DTOs correct
- [ ] Request validation working
- [ ] All endpoints tested
- [ ] Documentation updated

### Phase 6: Admin UI (Est. 4-5 hours)
- [ ] Form component updated
- [ ] Allowances repeater working
- [ ] Validation enforced
- [ ] List display updated
- [ ] All features tested

### Phase 7: Frontend (Est. 4-5 hours)
- [ ] Package selection updated
- [ ] Credits display updated
- [ ] Booking flow updated
- [ ] All components tested
- [ ] Responsive design verified

### Phase 8: Testing (Est. 4-6 hours)
- [ ] All existing tests updated
- [ ] New bundle tests added
- [ ] E2E scenarios covered
- [ ] All tests passing
- [ ] Coverage adequate

### Phase 9: Migration (Est. 2-3 hours)
- [ ] Pre-migration checklist done
- [ ] Staging tested
- [ ] Production backup ready
- [ ] Migration executed
- [ ] Post-validation complete

### Phase 10: Docs (Est. 2 hours)
- [ ] Technical docs written
- [ ] API docs updated
- [ ] Admin guide created
- [ ] Examples provided

---

## Risk Assessment

### High-Risk Items

1. **Data Migration Complexity**
   - Risk: Data loss or corruption during migration - not important. This is a dev env. No data is vital.
   - Mitigation: Comprehensive backup, testing on staging, row count verification

2. **Backward Compatibility**
   - Risk: Breaking existing booking flows
   - Mitigation: Thorough testing, gradual rollout, rollback plan

3. **Pessimistic Locking**
   - Risk: Race conditions or deadlocks under load
   - Mitigation: Load testing, lock timeout configuration

4. **Webhook Handling**
   - Risk: Payments failing to create balances
   - Mitigation: Extensive webhook tests, retry logic, monitoring

### Medium-Risk Items

1. **Performance with Relations**
   - Risk: N+1 query problems with allowances/balances
   - Mitigation: Eager loading, query optimization, monitoring

2. **UI Complexity**
   - Risk: Confusing bundle display for users
   - Mitigation: User testing, clear labeling, help text

### Low-Risk Items

1. **Type System Changes**
   - Risk: Type errors after migration
   - Mitigation: Full TypeScript compilation, linting

2. **Documentation**
   - Risk: Outdated or incomplete docs
   - Mitigation: Docs-as-code, review process

---

## Success Criteria

- [ ] All tests passing (100% existing + new coverage)
- [ ] Zero data loss during migration
- [ ] Production packages created with bundles
- [ ] Students can purchase and use bundles
- [ ] Credit balances tracked accurately
- [ ] Refunds applied to correct balance
- [ ] Tier validation working correctly
- [ ] Performance within SLAs (< 200ms for package loads)
- [ ] No customer impact or downtime
- [ ] Documentation complete and clear
- [ ] Team trained on new system

---

## Notes

- This is a significant architectural change affecting multiple layers
- Early testing in staging is critical
- Migration should happen in a maintenance window
- Monitor closely after production deployment
- Be prepared for quick rollback if needed
- Consider phased rollout if platform has existing production users

