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
