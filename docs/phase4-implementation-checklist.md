# Phase 4 Implementation Checklist

**File**: `apps/nestjs/src/packages/packages.service.ts`

This checklist provides step-by-step instructions for refactoring PackagesService to support bundle packages.

## Pre-requisites (Completed ✓)

- [x] Database schema created (PackageAllowance table)
- [x] Entities updated (PackageAllowance, StudentPackage with uses relation)
- [x] DTOs updated (CreatePackageSchema with allowances array)
- [x] Utility functions created (bundle-helpers.ts, package-query-builder.ts)

## Implementation Steps

### Step 1: Add New Imports and Dependencies

**File**: `packages.service.ts` (top of file)

Add imports:
```typescript
import { PackageAllowance } from "../../packages/entities/package-allowance.entity.js";
import {
  computeRemainingCredits,
  computeRemainingCreditsByServiceType,
  generateBundleDescription,
  validateAllowances,
} from "./utils/bundle-helpers.js";
import { PackageQueryBuilder } from "./utils/package-query-builder.js";
```

Add repository injection in constructor:
```typescript
@InjectRepository(PackageAllowance)
private readonly allowanceRepo: Repository<PackageAllowance>,
```

### Step 2: Create Helper Methods

Add these private methods to the class:

```typescript
/**
 * Build a PackageResponseDto from StripeProductMap and Stripe API data.
 * Handles both singular fetch and batch processing.
 */
private async buildPackageResponse(
  mapping: StripeProductMap,
  stripeProduct: Stripe.Product,
  stripePrice: Stripe.Price,
): Promise<PackageResponseDto> {
  const metadata = mapping.metadata || {};
  const bundleDescription =
    String(metadata.bundle_description) ||
    generateBundleDescription(mapping.allowances);

  return {
    id: mapping.id,
    name: String(metadata.name) || stripeProduct.name,
    bundleDescription,
    allowances: mapping.allowances || [],
    expiresInDays: metadata.expires_in_days
      ? Number(metadata.expires_in_days)
      : null,
    stripe: {
      productId: stripeProduct.id,
      priceId: stripePrice.id,
      lookupKey: stripePrice.lookup_key || mapping.serviceKey,
      unitAmount: stripePrice.unit_amount || 0,
      currency: stripePrice.currency || "usd",
    },
    active: mapping.active && stripeProduct.active,
  };
}

/**
 * Build multiple package responses. Reuses Stripe fetches.
 */
private async buildPackageResponses(
  mappings: StripeProductMap[],
): Promise<PackageResponseDto[]> {
  const packages: PackageResponseDto[] = [];

  for (const mapping of mappings) {
    try {
      const stripeProduct = await this.stripe.products.retrieve(
        mapping.stripeProductId,
      );

      if (!stripeProduct.active) continue;

      const prices = await this.stripe.prices.list({
        product: mapping.stripeProductId,
        active: true,
        limit: 1,
      });

      if (prices.data.length === 0) continue;

      const stripePrice = prices.data[0];
      const response = await this.buildPackageResponse(
        mapping,
        stripeProduct,
        stripePrice,
      );
      packages.push(response);
    } catch (error) {
      console.warn(
        `Failed to fetch Stripe data for mapping ${mapping.id}:`,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  return packages;
}
```

### Step 3: Update `getPackages()`

**Lines 65-126** - Replace entire method:

```typescript
async getPackages(): Promise<PackageResponseDto[]> {
  const mappings = await PackageQueryBuilder
    .buildPackageMappingQuery(this.stripeProductMapRepository)
    .orderBy("spm.created_at", "DESC")
    .getMany();

  return this.buildPackageResponses(mappings);
}
```

### Step 4: Update `getActivePackages()`

**Lines 128-195** - Replace entire method:

```typescript
async getActivePackages(): Promise<PackageResponseDto[]> {
  const mappings = await PackageQueryBuilder
    .buildActivePackageMappingQuery(this.stripeProductMapRepository)
    .orderBy("spm.created_at", "DESC")
    .getMany();

  return this.buildPackageResponses(mappings);
}
```

### Step 5: Update `getValidPackagesForSession()`

**Lines 197-287** - Replace entire method:

```typescript
async getValidPackagesForSession(
  sessionId: number,
): Promise<PackageResponseDto[]> {
  const session = await this.sessionRepo.findOne({
    where: { id: sessionId },
    relations: ["teacher"],
  });

  if (!session) {
    throw new NotFoundException("Session not found");
  }

  // Query packages with allowances matching the session type
  const validMappings = await PackageQueryBuilder
    .buildPackagesForSessionTypeQuery(
      this.stripeProductMapRepository,
      session.type,
    )
    .orderBy("spm.created_at", "DESC")
    .getMany();

  // Remove duplicates (one row per allowance)
  const uniqueMappings = Array.from(
    new Map(validMappings.map((m) => [m.id, m])).values(),
  );

  return this.buildPackageResponses(uniqueMappings);
}
```

### Step 6: Update `getPackage()`

**Lines 289-330** - Replace serviceType/teacherTier references:

Change lines 99-105 (in the response object) from:
```typescript
serviceType: mapping.serviceType || "PRIVATE",
credits: Number(metadata.credits) || 0,
creditUnitMinutes: Number(metadata.credit_unit_minutes) || 30,
teacherTier:
  mapping.teacherTier && mapping.teacherTier > 0
    ? mapping.teacherTier
    : null,
```

To use the helper method:
```typescript
// Just call buildPackageResponse
const stripeProduct = await this.stripe.products.retrieve(
  mapping.stripeProductId,
);
const prices = await this.stripe.prices.list({
  product: mapping.stripeProductId,
  active: true,
  limit: 1,
});
if (!stripeProduct.active || prices.data.length === 0) {
  throw new NotFoundException("Package not found or has no prices");
}
return this.buildPackageResponse(
  mapping,
  stripeProduct,
  prices.data[0],
);
```

### Step 7: Update `deactivatePackage()`

**Lines 352-370** - No changes needed (no serviceType/teacherTier references)

### Step 8: Update `generateLookupKey()`

**Lines 372-383** - Needs updating for allowances:

```typescript
generateLookupKey(dto: CreatePackageDto): string {
  // Use bundle description to generate key
  const bundleDesc = generateBundleDescription(dto.allowances)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  return `pkg_${bundleDesc}_${Date.now()}`;
}
```

### Step 9: Update `createPackage()` - CRITICAL METHOD

**Lines 384-488** - Replace entire method:

See detailed implementation in `docs/bundle-packages-service-refactoring.md` Section "4. Service Method Refactoring" -> "5. createPackage()"

Key changes:
- Accept `allowances` array from DTO
- Validate allowances using `validateAllowances()`
- Create single Stripe product for bundle
- Store allowances in Stripe metadata
- Create PackageAllowance rows in database
- Return response with allowances

### Step 10: Update `getActivePackagesForStudent()`

**Lines 491-536** - Replace entire method:

```typescript
async getActivePackagesForStudent(
  studentId: number,
): Promise<{
  packages: (StudentPackage & { remainingSessions: number })[];
  totalRemaining: number;
}> {
  const packages = await PackageQueryBuilder
    .buildActiveStudentPackagesQuery(this.pkgRepo, studentId)
    .orderBy("sp.created_at", "DESC")
    .getMany();

  // Compute remaining for each package
  const withRemaining = packages.map((pkg) => ({
    ...pkg,
    remainingSessions: computeRemainingCredits(
      pkg.totalSessions,
      pkg.uses || [],
    ),
  }));

  const totalRemaining = withRemaining.reduce(
    (sum, pkg) => sum + pkg.remainingSessions,
    0,
  );

  return {
    packages: withRemaining,
    totalRemaining,
  };
}
```

### Step 11: Update `usePackageForSession()` - CRITICAL METHOD

**Lines 538-584** - Replace entire method:

```typescript
async usePackageForSession(
  studentId: number,
  packageId: number,
  sessionId: number,
  options?: {
    serviceType?: ServiceType;
    creditsUsed?: number;
    usedBy?: number;
  },
): Promise<{ package: StudentPackage; use: PackageUse }> {
  const { serviceType, creditsUsed = 1, usedBy } = options || {};

  // Load with uses for balance computation (pessimistic lock)
  const pkg = await PackageQueryBuilder
    .buildStudentPackageWithUsesQuery(
      this.pkgRepo,
      studentId,
      packageId,
    )
    .setLock("pessimistic_write")
    .getOne();

  if (!pkg) {
    throw new NotFoundException("Package not found");
  }

  // Compute remaining credits
  const remaining = computeRemainingCredits(
    pkg.totalSessions,
    pkg.uses || [],
  );

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

  // Reload to verify
  const updated = await PackageQueryBuilder
    .buildStudentPackageWithUsesQuery(
      this.pkgRepo,
      studentId,
      packageId,
    )
    .getOne();

  return { package: updated!, use };
}
```

### Step 12: Update `getCompatiblePackagesForSession()` - COMPLEX METHOD

**Lines 696-800** - Major refactoring needed:

Change from returning packages filtered by single service type to:
1. Load all active student packages with uses
2. For each package, find allowance matching session type
3. Compute remaining credits for that service type only
4. Return with complete allowances array

See `docs/bundle-packages-service-refactoring.md` for detailed pseudocode.

### Step 13: Verify No Other References

Search for remaining references to deleted columns:
- `mapping.serviceType` → Should not exist anymore, use `allowances`
- `mapping.teacherTier` → Should not exist anymore, use `allowances[0].teacherTier`

## Testing Before Moving On

After each major method:
1. Compile: `npm run build:nestjs`
2. Run unit tests: `npm run test:nestjs`
3. Run E2E if available: `npm run test:nestjs:e2e`

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `mapping.serviceType is undefined` | Use `allowances` array instead |
| `mapping.teacherTier is undefined` | Use `allowances[index].teacherTier` |
| Balance computation is wrong | Verify PackageUse records are loaded with `uses` relation |
| Type errors in DTO | Check PackageResponseSchema uses `allowances: z.array(...)` |
| Query returns duplicates | Use `new Map(...).values()` to deduplicate by mapping ID |

## Next Steps After Phase 4

Once this service is refactored:
1. Update PaymentsService (handle webhook, create package balances from allowances)
2. Update BookingsService (use balance computation, refund to correct balance)
3. Update API controllers (return new DTO format)
4. Update WordPress components
