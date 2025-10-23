# Payment Intent Webhook Flow Diagram

## Current Behavior (Broken for Group Bookings)

```
Stripe Webhook: payment_intent.succeeded
│
├─ metadata contains:
│  ├─ product_id: "prod_..." ✓
│  ├─ price_id: "price_..." ✓
│  ├─ booking_id: "6" ✓
│  └─ session_id: "13" ✓
│
└─ handlePaymentIntentSucceeded()
   │
   ├─ Parse metadata
   │
   ├─ Check: isPackagePurchase = (product_id && price_id) ✓
   │  │
   │  └─ YES → handlePackagePurchase()
   │     │
   │     ├─ Create/Update StudentPackage ✓
   │     │
   │     ├─ Find Session by ID ✓
   │     │
   │     ├─ Check: if (sessionId)
   │     │  │
   │     │  ├─ sessionId found ✓
   │     │  │
   │     │  ├─ Check: if (session.status !== SessionStatus.DRAFT)
   │     │  │
   │     │  ├─ Session status is SCHEDULED (GROUP session)
   │     │  │  │
   │     │  │  ├─ Condition TRUE → RETURN EARLY ✗ BUG!
   │     │  │  │
   │     │  │  └─ Booking stays PENDING ✗
   │     │  │     No promotion happens!
   │     │  │
   │     │  └─ (Booking promotion code never reaches here)
   │     │
   │     └─ Transaction commits with package but no booking update
   │
   └─ else if (metadata.session_id && metadata.booking_id)
      │
      └─ ← NEVER REACHED because isPackagePurchase was true
         This is where booking would be promoted to CONFIRMED

Result: Booking status = PENDING ✗
```

## Fixed Behavior (What Should Happen)

```
Stripe Webhook: payment_intent.succeeded
│
├─ metadata contains:
│  ├─ product_id: "prod_..." ✓
│  ├─ price_id: "price_..." ✓
│  ├─ booking_id: "6" ✓
│  └─ session_id: "13" ✓
│
└─ handlePaymentIntentSucceeded()
   │
   ├─ Parse metadata
   │
   ├─ Check: isPackagePurchase = (product_id && price_id) ✓
   │  │
   │  └─ YES → handlePackagePurchase()
   │     │
   │     ├─ Create/Update StudentPackage ✓
   │     │
   │     ├─ Find Session by ID ✓
   │     │
   │     ├─ NEW: Extract bookingId from metadata
   │     │  │
   │     │  └─ bookingId = 6 ✓
   │     │
   │     ├─ NEW: Check if booking_id exists
   │     │  │
   │     │  └─ YES → Existing booking path
   │     │     │
   │     │     ├─ Query Booking(id=6, sessionId=13, studentId=2)
   │     │     │
   │     │     ├─ Check if booking status is PENDING ✓
   │     │     │
   │     │     ├─ UPDATE:
   │     │     │  ├─ booking.status = CONFIRMED ✓
   │     │     │  ├─ booking.acceptedAt = NOW() ✓
   │     │     │  └─ booking.studentPackageId = <package> ✓
   │     │     │
   │     │     └─ Log: "Promoted existing booking to CONFIRMED" ✓
   │     │
   │     └─ (Existing DRAFT logic skipped for this path)
   │
   └─ Transaction commits with package AND booking confirmation ✓

Result: Booking status = CONFIRMED ✓
```

## Scenario Comparison

### Private Session (One-to-One)

```
FLOW: Create Payment → Pay → Webhook
├─ createPaymentIntent()
│  └─ Creates DRAFT session
│     └─ Creates PENDING booking
│
└─ Webhook: payment_intent.succeeded
   ├─ isPackagePurchase? NO (no product_id/price_id)
   │
   └─ else if (booking_id && session_id)?
      ├─ YES
      ├─ Promote session: DRAFT → SCHEDULED ✓
      └─ Promote booking: PENDING → CONFIRMED ✓
```

### Group Session (Many-to-One) - CURRENT (BROKEN)

```
FLOW: Create Session → Create Pending Booking → Create Payment → Pay → Webhook
├─ Session already exists in SCHEDULED status
│
├─ createPaymentSession()
│  └─ Creates PENDING booking (not session)
│
└─ Webhook: payment_intent.succeeded
   ├─ isPackagePurchase? YES (has product_id/price_id)
   │
   └─ handlePackagePurchase()
      └─ Check session status != DRAFT?
         ├─ YES (session is SCHEDULED)
         └─ RETURN → Booking never promoted ✗
```

### Group Session (Many-to-One) - FIXED

```
FLOW: Create Session → Create Pending Booking → Create Payment → Pay → Webhook
├─ Session already exists in SCHEDULED status
│
├─ createPaymentSession()
│  └─ Creates PENDING booking (not session)
│
└─ Webhook: payment_intent.succeeded
   ├─ isPackagePurchase? YES (has product_id/price_id)
   │
   └─ handlePackagePurchase()
      ├─ Extract bookingId from metadata? YES (6)
      │
      ├─ Find existing booking?
      │  ├─ YES
      │  ├─ Status is PENDING?
      │  │  ├─ YES
      │  │  └─ Promote PENDING → CONFIRMED ✓
      │  │
      │  └─ Done ✓
      │
      └─ (DRAFT logic not needed for this path)
```

## Data State Transitions

### Current (Broken)

```
Before Webhook:
├─ Session: id=13, type=GROUP, status=SCHEDULED
├─ Booking: id=6, sessionId=13, status=PENDING
└─ StudentPackage: (doesn't exist yet)

After Webhook:
├─ Session: id=13, type=GROUP, status=SCHEDULED (unchanged)
├─ Booking: id=6, sessionId=13, status=PENDING ✗ (unchanged!)
└─ StudentPackage: created ✓ (but booking not linked)

Problem: Package exists but booking never confirmed!
```

### Fixed

```
Before Webhook:
├─ Session: id=13, type=GROUP, status=SCHEDULED
├─ Booking: id=6, sessionId=13, status=PENDING
└─ StudentPackage: (doesn't exist yet)

After Webhook:
├─ Session: id=13, type=GROUP, status=SCHEDULED (unchanged)
├─ Booking: id=6, sessionId=13, status=CONFIRMED ✓ (promoted!)
│           acceptedAt=2025-10-22T19:51:54Z (set)
│           studentPackageId=<id> (linked)
└─ StudentPackage: created ✓ (and linked to booking)

Result: Student sees booking as confirmed!
```

## Metadata Parsing Flow

```
Stripe PaymentIntent metadata (all strings):
{
  "booking_id": "6",
  "session_id": "13",
  "product_id": "prod_THc5ev859vRGXW",
  "price_id": "price_1SL2rcHrimnzYL8UIXW4cksA",
  "service_type": "GROUP",
  "student_id": "2",
  "user_id": "2"
}
        ↓
StripeMetadataUtils.fromStripeFormat()
        ↓
Parsed metadata (typed):
{
  booking_id: 6 (number),
  session_id: 13 (number),
  product_id: "prod_..." (string),
  price_id: "price_..." (string),
  service_type: "GROUP" (enum),
  student_id: 2 (number),
  user_id: 2 (number)
}
        ↓
Used to:
├─ Determine if package purchase (has product_id + price_id)
├─ Find session to book (session_id)
├─ Find booking to promote (booking_id) ← NEW
└─ Identify student (student_id)
```

## Key Insight

The webhook metadata contains **two different pieces of information**:

1. **Package Information** (product_id, price_id)
   - Used to identify what's being purchased
   - Triggers StudentPackage creation

2. **Booking Information** (booking_id, session_id)
   - Used to identify which booking to confirm
   - Currently ignored for package purchases!

**The fix**: Use BOTH pieces of information in the same webhook handler.
