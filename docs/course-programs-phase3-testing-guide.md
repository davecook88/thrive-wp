# Phase 3 Testing Guide: Course Progress Seeding

This guide walks through manual testing of the course progress seeding feature implemented in Phase 3.

## Prerequisites

- Docker environment running (`make up`)
- Admin user credentials
- Access to NestJS API at `http://localhost:3000`
- Access to database for verification

## Test Steps

### Step 1: Create a Course Program

**API Endpoint**: `POST /admin/course-programs`

```bash
curl -X POST http://localhost:3000/admin/course-programs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "code": "TEST_COURSE",
    "title": "Test Foundation Course",
    "description": "A test course for Phase 3 verification",
    "timezone": "America/New_York",
    "active": true
  }'
```

**Expected Response**:
```json
{
  "id": 1,
  "code": "TEST_COURSE",
  "title": "Test Foundation Course",
  "description": "A test course for Phase 3 verification",
  "timezone": "America/New_York",
  "active": true,
  "createdAt": "2025-10-24T...",
  "updatedAt": "2025-10-24T..."
}
```

**Note**: Save the `id` value for the next steps.

---

### Step 2: Add Course Steps

**API Endpoint**: `POST /admin/course-programs/:id/steps`

Create 3 steps for the course:

```bash
# Step 1
curl -X POST http://localhost:3000/admin/course-programs/1/steps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "stepOrder": 1,
    "label": "Session 1",
    "title": "Introduction",
    "courseProgramId": 1
  }'

# Step 2
curl -X POST http://localhost:3000/admin/course-programs/1/steps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "stepOrder": 2,
    "label": "Session 2",
    "title": "Fundamentals",
    "courseProgramId": 1
  }'

# Step 3
curl -X POST http://localhost:3000/admin/course-programs/1/steps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "stepOrder": 3,
    "label": "Session 3",
    "title": "Advanced Topics",
    "courseProgramId": 1
  }'
```

---

### Step 3: Create a Stripe Product with COURSE Allowance

**Option A: Using Admin UI** (if available):
1. Navigate to Packages admin page
2. Create new package
3. Add COURSE allowance with `courseProgramId: 1`
4. Set price and publish to Stripe

**Option B: Using Database** (for testing):

```sql
-- Insert StripeProductMap
INSERT INTO stripe_product_map (
  service_key, 
  stripe_product_id, 
  active, 
  scope_type, 
  metadata
) VALUES (
  'COURSE_CLASS',
  'prod_test_course_123',
  1,
  'GLOBAL',
  '{}'
);

-- Get the inserted ID (e.g., 5)
SELECT LAST_INSERT_ID();

-- Insert PackageAllowance with COURSE type
INSERT INTO package_allowance (
  stripe_product_map_id,
  service_type,
  course_program_id,
  credits,
  credit_unit_minutes
) VALUES (
  5,           -- stripe_product_map_id from above
  'COURSE',    -- service_type
  1,           -- course_program_id from Step 1
  3,           -- credits (matches number of steps)
  60           -- credit_unit_minutes
);
```

---

### Step 4: Simulate a Package Purchase

**Important**: This requires triggering the Stripe webhook handler. You have two options:

**Option A: Use Stripe Test Webhook**
1. Create a test payment intent via Stripe dashboard
2. Ensure metadata includes:
   - `price_id`: Your test price ID
   - `product_id`: `prod_test_course_123`
   - `user_id`: ID of test student user
3. Trigger `payment_intent.succeeded` webhook

**Option B: Direct Service Call** (for development testing):

Create a test script `test-course-purchase.ts`:

```typescript
import { PaymentsService } from './src/payments/payments.service';
import { CourseStepProgressService } from './src/course-programs/services/course-step-progress.service';

// Mock a payment intent object
const mockPaymentIntent = {
  id: 'pi_test_123',
  amount_received: 10000,
  currency: 'usd',
  metadata: {
    price_id: 'price_test_123',
    product_id: 'prod_test_course_123',
    user_id: '2',  // Replace with your test student user ID
  },
};

// Call the handler
await paymentsService.handlePaymentIntentSucceeded(mockPaymentIntent);
```

---

### Step 5: Verify Progress Records Created

**Check Database**:

```sql
-- Get the created StudentPackage
SELECT * FROM student_package 
WHERE source_payment_id = 'pi_test_123';
-- Note the student_package.id (e.g., 10)

-- Verify StudentCourseStepProgress records were created
SELECT 
  scsp.*,
  cs.step_order,
  cs.label,
  cs.title
FROM student_course_step_progress scsp
JOIN course_step cs ON cs.id = scsp.course_step_id
WHERE scsp.student_package_id = 10
ORDER BY cs.step_order;
```

**Expected Results**:
- 3 rows in `student_course_step_progress`
- All rows have:
  - `student_package_id = 10`
  - `status = 'UNBOOKED'`
  - `session_id = NULL`
  - `booked_at = NULL`
  - `completed_at = NULL`
- Each row references a different `course_step_id` (1, 2, 3)

---

### Step 6: Check Logs

**View NestJS logs**:

```bash
docker-compose logs -f nestjs | grep -i "course"
```

**Expected log entries**:
```
[PaymentsService] Created student package 10 with 3 credits
[PaymentsService] Seeded course progress for package 10, course 1
```

---

## Success Criteria

✅ Course program created with 3 steps  
✅ StripeProductMap created with COURSE allowance  
✅ Package purchase creates StudentPackage  
✅ 3 StudentCourseStepProgress records created automatically  
✅ All progress records in UNBOOKED status  
✅ No errors in logs  

---

## Troubleshooting

### No progress records created

**Check**:
1. Verify `package_allowance.course_program_id` is set correctly
2. Check `stripe_product_map` has `allowances` loaded with `relations: ["allowances"]`
3. Review logs for error messages during seeding

### "No steps found for course program" error

**Check**:
1. Verify course steps were created in Step 2
2. Ensure `course_step.course_program_id` matches the course ID
3. Run: `SELECT * FROM course_step WHERE course_program_id = 1;`

### Circular dependency errors

**Check**:
1. Ensure `CourseProgramsModule` is imported in `PaymentsModule`
2. Verify `CourseStepProgressService` is exported from `CourseProgramsModule`

---

## Next Steps After Testing

Once Phase 3 testing is successful:
1. Mark Phase 3 as complete in roadmap ✅
2. Begin Phase 4: API Controllers verification
3. Test booking integration (Phase 5)
