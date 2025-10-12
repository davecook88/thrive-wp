# Thrive Admin — Packages (Credits) Management Plan

This document defines the first admin surface to create and manage student packages for PRIVATE sessions, with a forward‑compatible foundation to support GROUP and COURSE offerings. Stripe remains the source of truth for catalog and payments; our app stores only minimal mappings and entitlements.

## Goals
- Admin can create a “Package” in WP Admin (thrive-admin) that:
  - Creates Stripe Product + Price(s) with structured metadata
  - Registers a Package record in our DB for convenient lookup/reporting
- Students purchasing a package receive credits (entitlements) stored locally (ledger).
- Design is extensible to GROUP and COURSE products later.

## Scope v1
- Offering type: PRIVATE credit packs (one-time purchases)
- Price types: one-time price (required); recurring optional (deferred)
- Credit accounting: fixed number of credits; credit unit in minutes; optional expiry
- No partial credit + cash mixing in v1 (all-or-nothing at booking)
- Admin UI: create, list, view details, deactivate

Out of scope v1 (planned later): recurring credit subscriptions, tiered teachers, teacher-scoped packs, coupons management UI, editing Stripe prices in-place (we’ll create new versions instead).

---

## Admin UX (Vue islands in thrive-admin)

New submenu: Thrive Admin → Packages

Pages/sections:
1) List Packages
   - Columns: Name, Service Type, Credits, Unit (min), Expiry, Status, Stripe Product, Prices
   - Actions: View, Deactivate (soft), Create New
2) Create Package (form)
   - Basic
     - Name (e.g., “Private 5-Pack”)
     - Description (internal/admin notes; optional public blurb stored in Stripe product)
     - Service Type: PRIVATE (fixed in v1; future: GROUP/COURSE)
   - Credits
     - Total credits (integer)
     - Credit unit minutes (e.g., 30)
     - Expiry days (optional, per purchase lot) — leave blank for no expiry
     - Scope (global | teacher:<id>) [hidden in v1, default global]
   - Pricing
     - Currency (default from Stripe account)
     - One-time price amount (minor units)
     - Lookup key (auto-suggested, editable): e.g., PRIVATE_CREDITS_5_USD
     - Recurring plan (deferred): disabled UI with note
   - Publish
     - Active (toggle)
     - Save → Creates Stripe product + price, then persists package record.

3) View Package
   - Read-only package details
   - Stripe IDs/links (open in new tab)
   - JSON preview of Stripe product/price metadata
   - Status/activation toggle (deactivate only)

Validation UX:
- Inline field validation (numbers, positive values, sensible ranges)
- Server errors surfaced in a dismissible alert

---

## Architecture & Data Flow

- Frontend (WP Admin, Vue): submits to WP AJAX endpoint (nonce + capability check)
- WP handler: calls NestJS Admin API over the unified origin (/api/…), forwarding the user session cookie (thrive_sess) so NestJS AdminGuard authorizes.
- NestJS Packages controller/service:
  - Validates DTO
  - Creates Product/Price in Stripe
  - Persists package definition (with Stripe IDs and metadata) in DB
  - Returns canonical package payload to WP

Why via NestJS: centralized business rules, Stripe secret key confined to backend, consistent DTO validation (nestjs-zod), and DB writes in one place.

---

## Data Model (DB)

Use existing tables wherever possible and keep Stripe as the payments source of truth.

What already exists:
- stripe_product_map — minimal mapping of service keys to Stripe products (with scopeType including 'package').
- order and order_item — snapshot of purchases and line items (including PACKAGE itemType) with price metadata.
- booking — student’s seat in a session.

What we will add (minimal changes):
- booking associations for package consumption
  - booking.package_order_item_id (int, nullable) — FK to order_item.id of the PACKAGE used.
  - booking.credits_cost (int, nullable) — how many credits this booking consumed (ceil(duration/unit)).

Why this works:
- Each package purchase is represented by an OrderItem (itemType=PACKAGE) whose metadata stores credits, credit_unit_minutes, and optional expires_in_days (captured from Stripe Price metadata at purchase time).
- Remaining credits for a package = OrderItem.metadata.credits - SUM(booking.credits_cost) over bookings referencing that OrderItem where status consumes credits (e.g., CONFIRMED/COMPLETED/NO_SHOW; not CANCELLED).
- No separate catalog_package or credit_lot/ledger tables are required. Each purchased package acts as its own “lot,” and bookings reference which lot they consumed from.

Notes:
- For performance, we can compute remaining credits via a view or cached projection later; start with direct queries.
- If refunds occur, we can mark the related Order/OrderItem as REFUNDED/CANCELLED (existing enums) and disallow future consumption from that item.

---

## Stripe Catalog

Stripe Product (type=service):
- name: from admin form
- description: optional public blurb
- metadata:
  - offering_type=PACKAGE
  - service_type=PRIVATE
  - credits=5
  - credit_unit_minutes=30
  - expires_in_days=180 (optional)
  - scope=global
  - app_package_id=<db id> (added after DB insert or in a two-phase flow)

Stripe Price (one-time):
- unit_amount
- currency
- lookup_key (e.g., PRIVATE_CREDITS_5_USD)
- metadata: duplicate the relevant package metadata for convenience

Stripe Webhooks (already used):
- On payment_intent.succeeded / checkout.session.completed with a line item referencing the package price:
  - Identify PACKAGE line items (by price.lookup_key or product metadata)
  - Upsert Order + OrderItem (itemType=PACKAGE) with a snapshot of Stripe price metadata, including:
    - credits (int), credit_unit_minutes (int), expires_in_days (int, optional), service_type, scope
  - No wallet/lot tables needed; this OrderItem represents the purchased package.

---

## NestJS Admin API (new)

Route base: /admin/packages (protected by AdminGuard; JWT in thrive_sess)

- POST /admin/packages (create package product)
  - Body (Zod DTO):
    {
      name: string,
      description?: string,
      serviceType: 'PRIVATE',
      credits: number > 0,
      creditUnitMinutes: number in [15, 30, 45, 60],
      expiresInDays?: number > 0,
      currency: string (ISO),
      amountMinor: number > 0,
      lookupKey?: string,
      scope?: 'global' | `teacher:${number}`
    }
  - Process:
    1) Create Stripe Product (type=service) with metadata (offering_type=PACKAGE,…)
    2) Create Stripe Price (one-time) with lookup_key and mirrored metadata
    3) Insert/Update stripe_product_map with serviceKey (e.g., PRIVATE_CREDITS_5_30), scopeType=PACKAGE, stripeProductId
  - Returns:
    {
      name: string,
      serviceType: 'PRIVATE',
      credits: number,
      creditUnitMinutes: number,
      expiresInDays?: number,
      stripe: { productId: string, priceId: string, lookupKey: string },
      active: boolean
    }

- GET /admin/packages
  - Lists package products by reading stripe_product_map with scopeType=PACKAGE and enriching from Stripe (product + prices).

- GET /admin/packages/:id

- POST /admin/packages/:productMapId/deactivate
  - Sets stripe_product_map.active=false; we do not delete Stripe artifacts.

- Utility (internal): Price generation helpers, lookup key normalization.

Validation: nestjs-zod for DTOs; clamp ranges; enforce serviceType=PRIVATE in v1.

Idempotency: POST should support an optional client-provided idempotencyKey; backend can detect duplicates by lookup_key or name+credits+unit.

---

## WordPress Integration (thrive-admin)

- PHP (includes/class-thrive-admin-bridge-admin.php):
  - Add submenu 'Packages' with templates/packages.php
  - Register AJAX handlers:
    - thrive_admin_packages_list → calls GET /api/admin/packages
    - thrive_admin_packages_create → calls POST /api/admin/packages
  - Pass wp_localize_script config for ajax_url, nonce

- Template (templates/packages.php):
  - Wrapper markup + a Vue island root: <div data-vue-component="packages-admin"></div>

- Vue (src/components/PackagesAdmin.vue):
  - Tabs: List | Create New
  - Form with client-side validation
  - Uses fetch to WP AJAX (nonce + action), server bridges to /api/admin/packages
  - Error and success toasts; link out to Stripe product/price
  - List view reads stripe_product_map entries (scopeType=PACKAGE) via NestJS, not a local catalog table.

Security:
- Admin capability check (manage_options)
- Nonce verification in AJAX handlers
- Server-side validation remains in NestJS; WP only forwards data

---

## Booking Consumption (for context)

- Required credits = ceil(booking_duration_minutes / credit_unit_minutes)
- Booking creation path selects a student’s valid package OrderItem (paid, not expired, remaining credits > 0) and sets:
  - booking.package_order_item_id = selected OrderItem.id
  - booking.credits_cost = computed credits for this booking
- Remaining credits = package.credits - SUM(credits_cost) for associated bookings with consuming statuses.
- No mixing in v1; either credits fully cover or not used.

---

## Extensibility to GROUP/COURSE

### GROUP Packages (Future)

Currently, **GROUP packages are not needed** because the tier system allows PRIVATE credits to be used for GROUP classes. This provides flexibility for students while maximizing their purchasing options.

**Future consideration**: If there's demand for lower-priced "group-only" packages, we can introduce them:
- `service_type: GROUP` with base tier 50
- Cannot be used for PRIVATE classes (tier validation)
- Could be priced lower than PRIVATE packages to incentivize group class attendance
- Same metadata structure: credits, credit_unit_minutes, teacher_tier (optional)

### COURSE Credits (Special Case)

COURSE sessions **do not use package credits**. Course enrollment is managed separately via `StudentCourseEnrollment`:
- Course purchase creates enrollment record
- Course step booking validates enrollment, not credits
- Courses may include **bundled private/group credits** as separate packages (tracked in `CourseBundleComponent`)

### Credit Tier System

See [`docs/credit-tiers-system.md`](credit-tiers-system.md) for complete details.

**Key rules**:
- PRIVATE credits (tier 100) can be used for GROUP classes (tier 50) with confirmation
- GROUP credits (tier 50) cannot be used for PRIVATE classes (tier 100)
- Refunds always go to the original package (tracked in `booking.studentPackageId`)
- Credits are fractional - a 60-minute credit can be split across multiple shorter sessions

**Package metadata fields**:
- `service_type`: PRIVATE, GROUP, or COURSE
- `credits`: Total number of credits
- `credit_unit_minutes`: Duration per credit (15/30/45/60)
- `teacher_tier` (optional): Minimum teacher tier requirement
- `expires_in_days` (optional): Expiration period

All metadata is stored in Stripe Product/Price metadata, `stripe_product_map.metadata`, and `student_package.metadata` for consistency. See [`docs/package-metadata.md`](package-metadata.md) for enforcement checklist.

---

## Quality Gates

- DTO validation (nestjs-zod) with tests
- Stripe creation integration test (mocked Stripe SDK in CI; record/playback or stripe-mock)
- DB migration + entity tests for FIFO lot consumption
- WP admin page loads and AJAX handshake test (manual ok for v1)

---

## Rollout Plan

1) DB migrations: add booking.package_order_item_id (FK → order_item.id), booking.credits_cost (int)
2) NestJS: admin packages controller/service to create Stripe products/prices and update stripe_product_map
3) Webhooks: ensure Order/OrderItem capture PACKAGE metadata (credits, unit, expiry)
4) Booking selection logic: choose a package and set booking fields; update e2e tests
5) WP Admin: Packages page (list + create) bridged to NestJS
6) Permissions & nonces wired
7) Manual Stripe test purchase; verify credits grant and booking consumption
8) Documentation update (this file, payments source-of-truth references)

Feature flag: hide menu until API passes health checks, or show with “Beta” badge.

---

## API Contracts (copy-paste reference)

Create Package — Request
{
  "name": "Private 5-Pack",
  "description": "Five 30-min private credits",
  "serviceType": "PRIVATE",
  "credits": 5,
  "creditUnitMinutes": 30,
  "expiresInDays": 180,
  "currency": "usd",
  "amountMinor": 19900,
  "lookupKey": "PRIVATE_CREDITS_5_USD"
}

Create Package — Response
{
  "name": "Private 5-Pack",
  "serviceType": "PRIVATE",
  "credits": 5,
  "creditUnitMinutes": 30,
  "expiresInDays": 180,
  "stripe": {
    "productId": "prod_...",
    "priceId": "price_...",
    "lookupKey": "PRIVATE_CREDITS_5_USD"
  },
  "active": true
}

List Packages — Response
[
  {
    "id": 12,
    "name": "Private 5-Pack",
    "serviceType": "PRIVATE",
    "credits": 5,
    "creditUnitMinutes": 30,
    "expiresInDays": 180,
    "stripe": {
      "productId": "prod_...",
      "priceId": "price_...",
      "lookupKey": "PRIVATE_CREDITS_5_USD"
    },
    "active": true
  }
]

---

## Notes & Decisions
- Stripe remains the catalog source of truth. Our DB mirrors the essentials to power UI and entitlements.
- Use Stripe price.lookup_key for deterministic identification.
- Prefer credit_lot for clean expiry and FIFO consumption.
- Deactivation is soft; we never delete Stripe products/prices.
- Names/lookup keys should be unique; backend generates a safe lookup key when omitted.

---

## Next Steps (actionable)
- [ ] Design DB migrations (NestJS TypeORM)
- [ ] Implement /admin/packages endpoints with Zod DTOs
- [ ] Wire webhooks to grant credits via lots
- [ ] Add WP admin menu, template, Vue component scaffold
- [ ] Bridge AJAX → NestJS API through /api/ with cookies
- [ ] Manual E2E: create package → test purchase → verify credits → book with credits
