# Bundle Packages Service Refactoring Guide

**Status**: In Progress
**Phase**: 4 - Service Layer Refactoring

## Overview

This document describes the refactoring of the PackagesService to support bundle packages with multiple service types. Key principles:

- **Single Source of Truth**: `PackageUse` records are authoritative
- **Computed Balances**: `remaining_credits = total_sessions - SUM(credits_used)`
- **No Denormalization**: Balances computed on-demand, can use materialized views later if performance is an issue
- **Backward Compatibility**: Old single-service packages work with bundle structure (one allowance = same as before)

## Architecture Changes

### 1. Entity Relationships

**Before:**
```
StripeProductMap
  ├─ serviceType (column)
  ├─ teacherTier (column)
  └─ metadata

StudentPackage
  ├─ totalSessions
  ├─ remainingSessions (column)
  └─ metadata
```

**After:**
```
StripeProductMap
  ├─ metadata
  └─ allowances[] (OneToMany)
      ├─ serviceType
      ├─ teacherTier
      ├─ credits
      └─ creditUnitMinutes

StudentPackage
  ├─ totalSessions
  ├─ metadata (snapshot of allowances at purchase)
  └─ uses[] (OneToMany - lazy loaded)
      ├─ serviceType
      ├─ creditsUsed
      └─ usedAt
```

Remaining credits are **computed**: `totalSessions - SUM(uses.creditsUsed)`

### 2. Helper Utilities

Created in `/apps/nestjs/src/packages/utils/`:

**bundle-helpers.ts**
- `computeRemainingCredits()` - Aggregate creditsUsed from PackageUse
- `computeRemainingCreditsByServiceType()` - Filter by service type, then aggregate
- `generateBundleDescription()` - Auto-generate "5 Private (30min) + 3 Group (60min)"
- `findAllowanceForServiceType()` - Find matching allowance in bundle
- `bundleContainsServiceType()` - Check if bundle has specific type
- `getTotalBundleCredits()` - Sum all credits across allowances
- `validateAllowances()` - Validate bundle configuration

**package-query-builder.ts**
- `buildPackageMappingQuery()` - Base query for package mappings with allowances
- `buildActivePackageMappingQuery()` - With active filter
- `buildPackagesForSessionTypeQuery()` - Filter by session service type
- `buildActiveStudentPackagesQuery()` - Student packages with uses loaded
- `buildStudentPackageWithUsesQuery()` - Single package with uses
- `loadPackageUses()` - Load uses for balance computation
- `loadPackageUsesByServiceType()` - Load uses filtered by service type

## Service Method Refactoring

### Modified Methods

#### 1. `getPackages()` → `getPackages()`

**Changes:**
- Query `StripeProductMap` with allowances loaded (not serviceType/teacherTier columns)
- Build response from `allowances` array
- Auto-generate bundle description if not provided

```typescript
async getPackages(): Promise<PackageResponseDto[]> {
  const mappings = await PackageQueryBuilder
    .buildPackageMappingQuery(this.stripeProductMapRepository)
    .orderBy("spm.created_at", "DESC")
    .getMany();

  const packages: PackageResponseDto[] = [];

  for (const mapping of mappings) {
    try {
      const stripeProduct = await this.stripe.products.retrieve(mapping.stripeProductId);
      if (!stripeProduct.active) continue;

      const prices = await this.stripe.prices.list({
        product: mapping.stripeProductId,
        active: true,
        limit: 1,
      });
      if (prices.data.length === 0) continue;

      const stripePrice = prices.data[0];
      const metadata = mapping.metadata || {};
      const bundleDescription = generateBundleDescription(mapping.allowances);

      packages.push({
        id: mapping.id,
        name: String(metadata.name) || stripeProduct.name,
        bundleDescription,
        allowances: mapping.allowances,
        expiresInDays: Number(metadata.expires_in_days) || null,
        stripe: {
          productId: stripeProduct.id,
          priceId: stripePrice.id,
          lookupKey: stripePrice.lookup_key || mapping.serviceKey,
          unitAmount: stripePrice.unit_amount || 0,
          currency: stripePrice.currency || "usd",
        },
        active: mapping.active && stripeProduct.active,
      });
    } catch (error) {
      console.warn(`Failed to fetch Stripe data for mapping ${mapping.id}:`, error);
    }
  }

  return packages;
}
```

#### 2. `getValidPackagesForSession(sessionId)` → `getValidPackagesForSession(sessionId)`

**Changes:**
- Query allowances filtered by session service type (not stripe_product_map.service_type)
- Get packages that contain the matching allowance
- Return all bundles, not filtered to single service type

```typescript
async getValidPackagesForSession(sessionId: number): Promise<PackageResponseDto[]> {
  const session = await this.sessionRepo.findOne({
    where: { id: sessionId },
    relations: ["teacher"],
  });
  if (!session) throw new NotFoundException("Session not found");

  // Query allowances filtered by session type
  const validMappings = await PackageQueryBuilder
    .buildPackagesForSessionTypeQuery(
      this.stripeProductMapRepository,
      session.type
    )
    .orderBy("spm.created_at", "DESC")
    .getMany();

  // Remove duplicates (multiple allowances from same package)
  const uniqueMappings = Array.from(
    new Map(validMappings.map(m => [m.id, m])).values()
  );

  // Build responses (same as getPackages)
  return this.buildPackageResponses(uniqueMappings);
}

private async buildPackageResponses(
  mappings: StripeProductMap[]
): Promise<PackageResponseDto[]> {
  // (same Stripe fetch logic as getPackages)
}
```

#### 3. `getActivePackagesForStudent(studentId)` → `getActivePackagesForStudent(studentId)`

**Changes:**
- Load student packages with uses loaded (for balance computation)
- Compute remaining credits from PackageUse records
- Return with computed balances

```typescript
async getActivePackagesForStudent(
  studentId: number
): Promise<{ packages: StudentPackage[]; totalRemaining: number }> {
  const packages = await PackageQueryBuilder
    .buildActiveStudentPackagesQuery(this.pkgRepo, studentId)
    .orderBy("sp.created_at", "DESC")
    .getMany();

  // Compute remaining for each
  const result = {
    packages: packages.map(pkg => ({
      ...pkg,
      remainingSessions: computeRemainingCredits(
        pkg.totalSessions,
        pkg.uses || []
      ),
    })),
    totalRemaining: 0,
  };

  result.totalRemaining = result.packages.reduce(
    (sum, pkg) => sum + pkg.remainingSessions,
    0
  );

  return result;
}
```

#### 4. `usePackageForSession()` → `usePackageForSession()`

**Changes:**
- Accept `serviceType` parameter to record which balance was used
- Accept `creditsUsed` parameter (can be > 1)
- Create PackageUse with serviceType and creditsUsed
- Compute remaining credits in response

```typescript
async usePackageForSession(
  studentId: number,
  packageId: number,
  sessionId: number,
  options?: {
    serviceType?: ServiceType;
    creditsUsed?: number;
    usedBy?: number;
  }
): Promise<{ package: StudentPackage; use: PackageUse }> {
  const { serviceType, creditsUsed = 1, usedBy } = options || {};

  // Load with uses for computation
  const pkg = await PackageQueryBuilder
    .buildStudentPackageWithUsesQuery(
      this.pkgRepo,
      studentId,
      packageId
    )
    .setLock("pessimistic_write")
    .getOne();

  if (!pkg) throw new NotFoundException("Package not found");

  // Compute remaining
  const remaining = computeRemainingCredits(pkg.totalSessions, pkg.uses || []);
  if (remaining < creditsUsed) {
    throw new BadRequestException("Insufficient credits");
  }

  // Check expiration
  if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
    throw new BadRequestException("Package has expired");
  }

  // Create use record
  const use = this.useRepo.create({
    studentPackageId: packageId,
    sessionId,
    serviceType,
    creditsUsed,
    usedAt: new Date(),
    usedBy,
  });

  await this.useRepo.save(use);

  // Reload package with updated uses
  const updated = await PackageQueryBuilder
    .buildStudentPackageWithUsesQuery(
      this.pkgRepo,
      studentId,
      packageId
    )
    .getOne();

  return { package: updated!, use };
}
```

#### 5. `createPackage()` → `createPackage()`

**Changes:**
- Accept `allowances` array instead of single serviceType
- Create Stripe product once for entire bundle
- Store allowances in metadata
- Create PackageAllowance rows for each
- Generate bundle description

```typescript
async createPackage(
  dto: CreatePackageDto
): Promise<PackageResponseDto> {
  // Validate allowances
  const validation = validateAllowances(dto.allowances);
  if (!validation.valid) {
    throw new BadRequestException(validation.errors.join(", "));
  }

  const lookupKey = dto.lookupKey || this.generateLookupKey(dto);

  // Check uniqueness
  const existing = await this.stripeProductMapRepository.findOne({
    where: { serviceKey: lookupKey },
  });
  if (existing) {
    throw new BadRequestException(`Lookup key "${lookupKey}" already exists`);
  }

  // Create Stripe product for entire bundle
  const stripeProduct = await this.stripe.products.create({
    name: dto.name,
    description: dto.description,
    type: "service",
    metadata: {
      name: dto.name,
      allowances: JSON.stringify(dto.allowances),
      expires_in_days: dto.expiresInDays || "",
      scope: dto.scope,
    },
  });

  // Create Stripe price
  const stripePrice = await this.stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: dto.amountMinor,
    currency: dto.currency.toLowerCase(),
    lookup_key: lookupKey,
    metadata: {
      allowances: JSON.stringify(dto.allowances),
    },
  });

  // Create local mapping
  const mapping = this.stripeProductMapRepository.create({
    serviceKey: lookupKey,
    stripeProductId: stripeProduct.id,
    active: true,
    scopeType: ScopeType.PACKAGE,
    metadata: {
      name: dto.name,
      bundle_description: dto.bundleDescription || generateBundleDescription(dto.allowances),
    },
  });

  const savedMapping = await this.stripeProductMapRepository.save(mapping);

  // Create PackageAllowance rows
  const allowances = dto.allowances.map(a =>
    this.allowanceRepo.create({
      stripeProductMapId: savedMapping.id,
      ...a,
    })
  );
  await this.allowanceRepo.save(allowances);

  // Reload with allowances
  savedMapping.allowances = allowances;

  return this.buildPackageResponse(savedMapping, stripeProduct, stripePrice);
}
```

#### 6. `getCompatiblePackagesForSession()` → `getCompatiblePackagesForSession()`

**Changes:**
- Load student packages with uses and allowances (from stripe_product_map)
- For each package, find allowances matching session type
- Compute remaining credits for that service type
- Separate into exactMatch/higherTier based on tier logic

```typescript
async getCompatiblePackagesForSession(
  studentId: number,
  sessionId: number
): Promise<CompatiblePackagesForSessionResponseDto> {
  const session = await this.sessionRepo.findOne({
    where: { id: sessionId },
    relations: ["teacher"],
  });
  if (!session) throw new NotFoundException("Session not found");

  // Load student's active packages with uses
  const packages = await PackageQueryBuilder
    .buildActiveStudentPackagesQuery(this.pkgRepo, studentId)
    .getMany();

  // Load stripe_product_map for each package to get allowances
  const compatiblePackages: CompatiblePackage[] = [];

  for (const pkg of packages) {
    // Load uses for balance computation
    const uses = await PackageQueryBuilder.loadPackageUsesByServiceType(
      this.useRepo,
      pkg.id,
      session.type
    );

    // Get mapping for allowances
    const mapping = await this.stripeProductMapRepository.findOne({
      where: { scopeType: ScopeType.PACKAGE },
      relations: ["allowances"],
    });

    if (!mapping) continue;

    // Find matching allowance
    const allowance = findAllowanceForServiceType(
      mapping.allowances,
      session.type
    );

    if (!allowance) continue; // Package doesn't have this service type

    const remaining = computeRemainingCreditsByServiceType(
      pkg.totalSessions,
      uses,
      session.type
    );

    compatiblePackages.push({
      id: pkg.id,
      label: pkg.packageName,
      remainingSessions: remaining,
      expiresAt: pkg.expiresAt?.toISOString() || null,
      creditUnitMinutes: allowance.creditUnitMinutes,
      tier: allowance.teacherTier,
      allowances: mapping.allowances,
    });
  }

  // Separate into exact match / higher tier
  const sessionTier = getSessionTier(session);
  const exactMatch: CompatiblePackage[] = [];
  const higherTier: CompatiblePackageWithWarning[] = [];

  for (const pkg of compatiblePackages) {
    const packageTier = pkg.tier;
    const canUse = canUsePackageForSession(pkg, sessionTier);

    if (!canUse) continue;

    if (packageTier >= sessionTier) {
      exactMatch.push(pkg);
    } else {
      higherTier.push({
        ...pkg,
        warningMessage: `This package requires a higher tier (${packageTier}) than the session (${sessionTier})`,
      });
    }
  }

  // Find recommended
  let recommended: number | null = null;
  if (exactMatch.length > 0) {
    recommended = exactMatch[0].id; // First exact match
  } else if (higherTier.length > 0) {
    recommended = higherTier[0].id; // Fall back to higher tier
  }

  return {
    exactMatch,
    higherTier,
    recommended,
    requiresCourseEnrollment: session.type === ServiceType.COURSE,
    isEnrolledInCourse: session.type === ServiceType.COURSE, // TODO: implement enrollment check
  };
}
```

## Implementation Order

1. **Utility Functions** ✓ (done)
   - bundle-helpers.ts
   - package-query-builder.ts
   - Entity relation (StudentPackage.uses)

2. **Phase 4.1: Simple Read Methods** (next)
   - getPackages()
   - getActivePackages()
   - getValidPackagesForSession()

3. **Phase 4.2: Write Methods**
   - createPackage()
   - usePackageForSession()

4. **Phase 4.3: Complex Methods**
   - getActivePackagesForStudent()
   - getCompatiblePackagesForSession()

5. **Phase 4.4: Supporting Methods**
   - generateLookupKey()
   - buildPackageResponse()
   - buildPackageResponses()
   - Helper tier methods

6. **Phase 4.5: PaymentsService Integration**
   - handlePackagePurchase()
   - bookWithPackage()

7. **Phase 4.6: BookingsService Integration**
   - createBooking() with package support
   - cancelBooking() with refund logic

## Testing Strategy

- Unit tests for bundle-helpers functions
- Integration tests for query builders
- E2E tests for each service method
- Focus on: multi-allowance bundles, balance computation, tier logic, refunds

## Rollback Strategy

All methods maintain backward compatibility with single-allowance packages (legacy packages become bundles with one allowance).
