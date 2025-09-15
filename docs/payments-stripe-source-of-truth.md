# Payments — Stripe as Source of Truth

Stripe remains the source of truth for payment state. We now create draft fulfillment records (Session + Booking) before payment completion to simplify downstream flows and unify treatment of private classes as packages.

## Updated Flow Overview
1. User selects a package (all PRIVATE one‑offs are represented as single‑credit packages).
2. User clicks Confirm & Pay.
3. Server validates availability and creates:
   - Session (status = DRAFT)
   - Booking (status = PENDING)
   in a single DB transaction.
4. Server creates a Stripe PaymentIntent embedding session_id & booking_id plus contextual metadata.
5. Client confirms payment using Payment Element.
6. Webhook:
   - `payment_intent.succeeded`: promote Session DRAFT -> SCHEDULED, Booking PENDING -> CONFIRMED (set accepted_at)
   - `payment_intent.payment_failed`: cancel Session (DRAFT -> CANCELLED) & Booking (PENDING -> CANCELLED) with reason.
7. Legacy path (no pre-created draft) still supported; webhook will create on success if no IDs present.

## Metadata Fields (PaymentIntent)
```
student_id, user_id, service_type, teacher_id, start_at, end_at,
product_id, price_id, session_id, booking_id, notes, source
```

## API Endpoints (Relevant)
* POST /payments/create-session — Draft-first flow for package/private booking. Body: { priceId, bookingData: { start, end, teacher } }. Returns: { clientSecret }.
* POST /payments/payment-intent — Legacy create-on-success path (may deprecate).

## Entity Status Lifecycle
Session: DRAFT -> SCHEDULED -> (COMPLETED | CANCELLED)
Booking: PENDING -> CONFIRMED -> (CANCELLED | NO_SHOW | FORFEIT)

## Availability Semantics
Pending (PENDING) bookings block additional bookings to avoid double-booking while payment is in flight.

## Migration
Migration `1756431459161-AddDraftStatuses.ts` adds enum values:
* Session.status: + DRAFT
* Booking.status: + PENDING

## Cleanup & Future Enhancements
* Add job to expire stale DRAFT/PENDING (PaymentIntent abandoned).
* Support multi-credit packages allocating multiple future draft sessions.
* Surface draft state in teacher/admin dashboards.
* Add audit log entries for each status transition.
# Payments — Stripe as Source of Truth

We rely on Stripe for all payment state. The app does not persist local Orders or OrderItems. Fulfillment is created from Stripe webhook metadata.

Key points:
- Catalog: Products and Prices are authored in Stripe. We keep a minimal `stripe_product_map` to resolve a ServiceType to a Product.
- Client requests never include amounts or currency; server fetches Stripe Price to compute totals.
- Payment Intent metadata carries fulfillment context: student_id, service_type, teacher_id, start_at, end_at, product_id, price_id.
- On `payment_intent.succeeded`, we create a Session and Booking from metadata.
- On failure, we log; no local order state to update.

API
- POST /payment/payment-intent
  - Body: start, end, teacher, serviceType, notes?
  - Returns: { clientSecret, publishableKey, amountMinor, currency }

Notes
- Session creation currently uses UTC times.
- Capacity/race checks should be enhanced in the webhook path prior to booking.
- Future: packages/courses via entitlements.
