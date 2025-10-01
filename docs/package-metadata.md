# Package Metadata Contract

This document defines the required metadata keys that MUST be persisted everywhere a package is represented so allowance calculations can determine:
1. How many credits a student has
2. For which teacher tier those credits apply
3. For what class (session) length those credits apply
4. Which service type (PRIVATE/GROUP/COURSE)

## Why This Exists
Previously `credit_unit_minutes` (and prospective `teacher_tier`) were written only to the `stripe_product_map.metadata` and Stripe Product metadata, but were **not** copied onto `student_package.metadata` when a purchase was completed. As a result, downstream allowance calculations could not segment a student's remaining credits by teacher tier or class length.

## Authoritative Metadata Keys
These keys are stored in ALL of the following locations:
- Stripe Product metadata
- Stripe Price metadata
- `stripe_product_map.metadata`
- `student_package.metadata` (created at purchase webhook time)

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `service_type` | string | yes | Enum value (currently `PRIVATE`) | 
| `credits` | number (string in Stripe) | yes | Total credits contained in package |
| `credit_unit_minutes` | number (string in Stripe) | yes | Minutes per credit (15/30/45/60) |
| `teacher_tier` | number (string in Stripe) | no | Minimum teacher tier the credits are valid for. Empty = any tier |
| `expires_in_days` | number (string in Stripe) | no | Expiration window; blank/0 = no expiry |
| `scope` | string | yes | Scope label (e.g. `global`) |

## Student Package Persistence
When a package purchase webhook (`payment_intent.succeeded`) fires, the system now copies the full set of keys into `student_package.metadata` so reporting & entitlement logic can work without re-calling Stripe.

Example `student_package.metadata` after purchase:
```json
{
  "stripeProductId": "prod_123",
  "stripePriceId": "price_123",
  "amountPaid": 25000,
  "currency": "usd",
  "credit_unit_minutes": 60,
  "teacher_tier": 30,
  "service_type": "PRIVATE"
}
```

## Querying Allowances
Use `PackagesService.getActivePackagesForStudent()` which now returns for each package:
```ts
{
  id: number;
  packageName: string;
  totalSessions: number;       // original credits
  remainingSessions: number;   // remaining credits
  creditUnitMinutes: number | null;
  teacherTier: number | null;
  serviceType: string;         // e.g. 'PRIVATE'
  purchasedAt: ISOString;
  expiresAt: ISOString | null;
}
```

Aggregations provided:
- `totalRemaining` (raw credit count across active packs)
- `totalRemainingByTime` (credits * minutes for each pack)

## Adding New Metadata
If you add any new dimension that affects entitlement (e.g. subject, level, modality):
1. Add it to `CreatePackageDto`
2. Write it to Stripe Product + Price metadata
3. Persist it in `stripe_product_map.metadata`
4. Copy it into `student_package.metadata` in `PaymentsService.handlePackagePurchase`
5. Expose it via the packages service allowance methods
6. Update this document

## Enforcement Checklist
PRs impacting packages MUST confirm:
- [ ] All required metadata keys are present in Product, Price, map, and student package
- [ ] Tests updated if response shape changed
- [ ] This doc updated if new key added

Failure to persist metadata everywhere causes silent entitlement logic errors later.
