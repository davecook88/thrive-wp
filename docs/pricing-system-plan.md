# Pricing System Plan — Stripe as Source of Truth (SoT)

We author Products and Prices directly in Stripe and treat them as the catalog source of truth. The application resolves what to sell using a simple key (e.g., ONE_ON_ONE) or a specific Stripe Price ID, and uses Stripe PaymentIntents. On success (via webhook), we finalize fulfillment (e.g., create a Booking). We no longer persist local Orders/OrderItems; Stripe is the source of truth for payment state and amount.

Primary outcomes:
- Remove local price table entirely; lean on Stripe’s Products/Prices.
- Keep minimal local mapping to link Stripe catalog items to internal concepts (course/session/package) and URL keys.
- Eliminate amount/currency from client requests to prevent tampering and fix validation errors.

## Catalog Model (in Stripe)

- Product: represents an offering (examples: ONE_ON_ONE, Course: Spanish 101, Session: 2025-10-12 9am, Package: 5 Lessons).
- Price: represents the sellable amount for a Product (currency, unit_amount, recurring or one-time). Multiple prices per product are allowed (e.g., currencies or tiers). For Phase 1 we’ll use one-time USD prices.
- Optional metadata on Product/Price:
  - service_key: canonical key like ONE_ON_ONE, COURSE:123, SESSION:456, PACKAGE:LESSON_5
  - scope_type/scope_id: link to internal tables when needed (e.g., session/course IDs)
  - any business flags (e.g., level, age-group) for analytics/debug, not enforcement

Author prices in the Stripe Dashboard. Optionally create via API and set metadata consistently.

## URL and Routing

- WordPress booking links encode a key: e.g., /book?item=ONE_ON_ONE or /book/ONE_ON_ONE
- Frontend posts to our API with either:
  - priceKey: 'ONE_ON_ONE' (preferred), or
  - stripePriceId: 'price_123' (advanced or admin flows)
- Quantity default = 1; can be extended for packages if needed.

## Local Mapping (Minimal)

We maintain a small table that maps a key or internal scope to Stripe catalog entries. No local prices are stored.

Tables:

1) stripe_price_map
   - id (PK)
   - price_key varchar(120) NOT NULL UNIQUE  // e.g., 'ONE_ON_ONE', 'COURSE:123'
   - stripe_product_id varchar(64) NOT NULL
   - stripe_price_id varchar(64) NOT NULL UNIQUE
   - currency char(3) NOT NULL
   - active boolean NOT NULL default true     // mirrors Stripe price active/archive
   - is_default boolean NOT NULL default false // if multiple prices per key
   - scope_type enum('course','session','package','service') NULL // optional
   - scope_id int NULL // optional, when linking to our DB objects for fulfillment
   - metadata json NULL
   - created_at, updated_at datetime(3)

2) (Optional) stripe_product_map
   - id (PK)
   - product_key varchar(120) NOT NULL UNIQUE // if you want key at product level
   - stripe_product_id varchar(64) NOT NULL UNIQUE
   - created_at, updated_at datetime(3)

We can operate with only stripe_price_map using price_key; product_map is optional.

## Fulfillment

On webhook success, we create fulfillment directly from Stripe metadata (student_id, service_type, teacher_id, start_at, end_at). For sessions, we create a Session and a Booking. For courses/packages, future phases may add entitlements.

student.stripe_customer_id (column on student)
- Reuse Stripe customer for future checkouts and saved methods.

## API: Payment Intent

POST /payment/payment-intent
Body (one of):
- { "priceKey": "ONE_ON_ONE", "quantity"?: number }
- { "stripePriceId": "price_123", "quantity"?: number }

Server behavior:
1) Resolve Stripe Price:
   - If priceKey: lookup in stripe_price_map where active=true and (is_default or only entry); otherwise 400 if unknown.
   - If stripePriceId: verify it exists in stripe_price_map and is active; optional authorization to scope if provided.
2) Fetch the Price from Stripe to ensure active and to read unit_amount/currency (server trust only).
3) Create or fetch Stripe Customer for the authenticated student; store student.stripe_customer_id if missing.
4) Create PaymentIntent with amount=unit_amount * qty, currency, customer, and metadata { student_id, service_type, teacher_id, start_at, end_at, product_id, price_id }.
5) Return { clientSecret, amountMinor, currency }.

Validation errors from amount/currency disappear because the client no longer provides them.

## Webhook Handling

POST /payment/webhook
- Handle: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
- On succeeded:
  - Fulfillment:
    - For session purchase metadata: create Session (if needed) and Booking (respect unique(sessionId, studentId)).
    - Packages/courses: planned via entitlements in a future phase.
- On failed: log failure (no local order state).
- On refund: future work (consider revoking entitlements/cancelling bookings).

## Entitlements for Packages (optional Phase 1, recommended Phase 2)

For packages like "5 Lessons", create credits on success:
- credit_grant
  - id (PK)
  - student_id int NOT NULL
  - source_order_id int NOT NULL
  - service_key varchar(120) NOT NULL // e.g., 'ONE_ON_ONE'
  - credits int NOT NULL              // number of uses
  - expires_at datetime NULL          // optional
  - created_at datetime(3)

- credit_ledger
  - id (PK)
  - student_id int NOT NULL
  - grant_id int NOT NULL (FK credit_grant.id)
  - session_id int NULL  // when redeemed for a specific session booking
  - delta int NOT NULL    // -1 for redemption, +N for adjustments
  - created_at datetime(3)

Booking flow for packages: when student books a session, consume a credit (atomic decrement), then create Booking.

## Sync Strategy (Stripe → Local)

- Webhooks: product.created/updated, price.created/updated, price.deleted
  - Upsert into stripe_price_map, set active=false when Price becomes inactive/archived.
- Backfill: periodic job to list Products/Prices to heal missed events.
- Metadata: when creating in Stripe (via script or API), set service_key and/or scope_type/scope_id for easier mapping.

## Admin/Authoring

- Define Products/Prices in Stripe Dashboard.
- Keep a simple admin page to bind priceKey → Stripe Price (writes `stripe_price_map`). Optionally show read-only details from Stripe.
- WordPress authors use priceKey in links (e.g., ONE_ON_ONE), not amounts.

## Edge Cases & Rules

- Currency: Start with USD. For multi-currency, add additional Stripe Prices and mark one as default per key.
- Capacity: For sessions, re-check capacity on webhook success before finalizing Booking; if full due to a race, refund and optionally place on waitlist.
- Idempotency: Use PaymentIntent ID when updating Orders; use Stripe idempotency keys when creating PaymentIntents.
- Security: Never trust client amounts or currency; only trust Stripe Price data fetched server-side.
- Quantity: Allow quantity > 1 for packages; for sessions, force quantity=1.
- Time windows: Encode in Stripe metadata, enforce on server (reject if outside sale window).
- When generating a booking, we need to think about race conditions - what happens if another booking comes in before the webhook confirming payment has been resolved? - Create booking in draft state first, then confirm/reject on webhook

## Minimal Migration Set

1) Create table `stripe_price_map` (structure above). Optionally `stripe_product_map`.
2) Add `student.stripe_customer_id` varchar(64) NULL.
3) (Optional Phase 2) Add `credit_grant` and `credit_ledger` for packages.


## Optional: Stripe Checkout Sessions

- Instead of PaymentIntents + custom form, you can redirect to Stripe Checkout with line_items=[{ price: stripe_price_id, quantity }].
- Still create an Order before redirect; reconcile on webhook.
- Faster to ship; less control over UX.

## Open Questions

- For courses, should fulfillment enroll immediately or grant credits to be redeemed per session?
- Do we need per-region tax handling now (Stripe Tax) or later?
- Should priceKey be a stable slug (e.g., ONE_ON_ONE) or a typed ref like SERVICE:ONE_ON_ONE vs COURSE:123?

## Package / Credit Metadata (Authoring Reminder)

When creating or updating package-oriented Products & Prices in Stripe you MUST set:
- credits
- credit_unit_minutes
- service_type (e.g. PRIVATE)
- (optional) teacher_tier
- (optional) expires_in_days

All of these are mirrored into `stripe_product_map.metadata` and copied into `student_package.metadata` at purchase time. See `docs/package-metadata.md` for full contract and enforcement checklist.

