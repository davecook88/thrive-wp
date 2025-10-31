# Enrollment Flow - Cohort-Based Course Purchase

## Overview

This document details the complete enrollment flow from student clicking "Enroll" to successful session booking, including Stripe checkout, webhook handling, and the session selection wizard.

---

## Flow Summary

```
1. Student clicks "Enroll in Fall Cohort" → Validation
2. Create Stripe checkout session → Redirect
3. Student completes payment in Stripe
4. Stripe webhook fires → Process purchase
5. Create StudentPackage + seed progress records
6. Redirect to success page → Open session selection wizard
7. Auto-book single-option steps
8. Prompt for multi-option step selections
9. Complete enrollment → Redirect to dashboard
```

---

## Step 1: Enrollment Initiation

### Frontend: Cohort Enroll Button

**Location:** `CourseCohorts.tsx` block (already implemented in 04-course-cpt-blocks.md)

**Key Points:**
- Button calls `POST /course-programs/:code/cohorts/:cohortId/enroll`
- Includes student authentication cookie
- Handles errors gracefully
- Redirects to Stripe checkout URL

---

## Step 2: Create Stripe Checkout Session

### Backend: EnrollmentController

**File:** `/apps/nestjs/src/course-programs/controllers/enrollment.controller.ts`

```typescript
import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CourseEnrollmentService } from '../services/course-enrollment.service.js';
import { EnrollCohortDto } from '@thrive/shared/types/course-programs.js';

@Controller('course-programs')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: CourseEnrollmentService) {}

  @Post(':code/cohorts/:cohortId/enroll')
  async enrollInCohort(
    @Param('code') code: string,
    @Param('cohortId') cohortId: number,
    @Body() dto: EnrollCohortDto,
    @Req() req: any,
  ) {
    const studentId = req.user.id;
    return this.enrollmentService.createCheckoutSession(
      studentId,
      code,
      cohortId,
      dto,
    );
  }
}
```

### Service: CourseEnrollmentService

**File:** `/apps/nestjs/src/course-programs/services/course-enrollment.service.ts`

```typescript
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { CourseProgram } from '../entities/course-program.entity.js';
import { CourseCohort } from '../entities/course-cohort.entity.js';
import { StudentPackage } from '../../packages/entities/student-package.entity.js';
import { StripeProductMap } from '../../stripe/entities/stripe-product-map.entity.js';

@Injectable()
export class CourseEnrollmentService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(CourseProgram)
    private courseProgramRepo: Repository<CourseProgram>,
    @InjectRepository(CourseCohort)
    private cohortRepo: Repository<CourseCohort>,
    @InjectRepository(StudentPackage)
    private packageRepo: Repository<StudentPackage>,
    @InjectRepository(StripeProductMap)
    private stripeMapRepo: Repository<StripeProductMap>,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(
    studentId: number,
    courseCode: string,
    cohortId: number,
    dto: { successUrl?: string; cancelUrl?: string },
  ) {
    // 1. Find course
    const course = await this.courseProgramRepo.findOne({
      where: { code: courseCode, isActive: true },
    });

    if (!course) {
      throw new BadRequestException('Course not found or not active');
    }

    // 2. Find cohort and validate
    const cohort = await this.cohortRepo.findOne({
      where: { id: cohortId, courseProgramId: course.id },
    });

    if (!cohort) {
      throw new BadRequestException('Cohort not found');
    }

    if (!cohort.isActive) {
      throw new BadRequestException('Cohort is not active');
    }

    if (cohort.currentEnrollment >= cohort.maxEnrollment) {
      throw new BadRequestException('Cohort is full');
    }

    const now = new Date();
    if (cohort.enrollmentDeadline && cohort.enrollmentDeadline < now) {
      throw new BadRequestException('Enrollment deadline has passed');
    }

    // 3. Check student doesn't already own this course
    const existingPackage = await this.packageRepo.findOne({
      where: {
        studentId,
        courseProgramId: course.id,
      },
    });

    if (existingPackage) {
      throw new ConflictException('You are already enrolled in this course');
    }

    // 4. Get Stripe price ID
    const stripeMap = await this.stripeMapRepo.findOne({
      where: { entityType: 'course_program', entityId: course.id },
    });

    if (!stripeMap || !stripeMap.stripePriceId) {
      throw new BadRequestException('Course is not available for purchase');
    }

    // 5. Create Stripe checkout session
    const successUrl =
      dto.successUrl ||
      `${process.env.WP_BASE_URL}/enrollment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      dto.cancelUrl || `${process.env.WP_BASE_URL}/courses/${courseCode}`;

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: undefined, // Stripe will prompt or use existing customer
      line_items: [
        {
          price: stripeMap.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        studentId: studentId.toString(),
        courseProgramId: course.id.toString(),
        courseCode: course.code,
        cohortId: cohort.id.toString(),
        cohortName: cohort.name,
        entityType: 'course_enrollment',
      },
      payment_intent_data: {
        metadata: {
          studentId: studentId.toString(),
          courseProgramId: course.id.toString(),
          cohortId: cohort.id.toString(),
        },
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }
}
```

---

## Step 3: Stripe Webhook Processing

### Webhook Handler

**File:** `/apps/nestjs/src/stripe/stripe-webhook.controller.ts` (extend existing)

```typescript
import { Controller, Post, Req, Headers, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { CourseEnrollmentService } from '../course-programs/services/course-enrollment.service.js';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private stripe: Stripe;

  constructor(
    private readonly courseEnrollmentService: CourseEnrollmentService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return { error: 'Webhook signature verification failed' };
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.entityType === 'course_enrollment') {
        await this.courseEnrollmentService.handleCheckoutComplete(session);
      }
    }

    return { received: true };
  }
}
```

### Service: handleCheckoutComplete

**Add to CourseEnrollmentService:**

```typescript
async handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const {
    studentId,
    courseProgramId,
    cohortId,
    cohortName,
    courseCode,
  } = session.metadata;

  // Idempotency: Check if already processed
  const existing = await this.packageRepo.findOne({
    where: {
      studentId: parseInt(studentId),
      courseProgramId: parseInt(courseProgramId),
    },
  });

  if (existing) {
    console.log('Enrollment already processed:', session.id);
    return;
  }

  // Start transaction
  await this.dataSource.transaction(async (manager) => {
    // 1. Create StudentPackage
    const studentPackage = manager.create(StudentPackage, {
      studentId: parseInt(studentId),
      packageName: `${courseCode} - ${cohortName}`,
      packageType: 'COURSE',
      courseProgramId: parseInt(courseProgramId),
      stripePaymentIntentId: session.payment_intent as string,
      purchasedAt: new Date(),
      expiresAt: null, // Courses don't expire
    });

    await manager.save(studentPackage);

    // 2. Increment cohort enrollment
    await manager.increment(
      CourseCohort,
      { id: parseInt(cohortId) },
      'currentEnrollment',
      1,
    );

    // 3. Seed StudentCourseStepProgress records
    const course = await manager.findOne(CourseProgram, {
      where: { id: parseInt(courseProgramId) },
      relations: ['steps'],
    });

    for (const step of course.steps) {
      await manager.save(StudentCourseStepProgress, {
        studentPackageId: studentPackage.id,
        courseStepId: step.id,
        cohortId: parseInt(cohortId),
        status: 'UNBOOKED',
        sessionId: null,
        bookedAt: null,
        completedAt: null,
      });
    }

    console.log(`Course enrollment created: Package ID ${studentPackage.id}`);
  });
}
```

---

## Step 4: Success Page & Session Selection Wizard

### WordPress Success Page Template

**File:** `/apps/wordpress/themes/custom-theme/page-enrollment-success.php`

```php
<?php
/**
 * Template Name: Enrollment Success
 */

get_header();

$session_id = isset($_GET['session_id']) ? sanitize_text_field($_GET['session_id']) : '';
?>

<main id="main" class="site-main enrollment-success">
    <div class="container">
        <h1>Enrollment Successful!</h1>
        <p>Thank you for enrolling. Let's book your sessions now.</p>

        <div id="session-wizard-mount" data-session-id="<?php echo esc_attr($session_id); ?>"></div>
    </div>
</main>

<?php
get_footer();
```

### Session Selection Wizard Component

**File:** `/apps/wordpress/themes/custom-theme/src/components/SessionSelectionWizard.tsx`

```tsx
import React, { useEffect, useState } from "react";

interface SessionSelectionWizardProps {
  stripeSessionId: string;
}

interface Step {
  stepId: number;
  stepLabel: string;
  stepTitle: string;
  stepOrder: number;
  options: StepOption[];
}

interface StepOption {
  courseStepOptionId: number;
  groupClassName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  availableSeats: number;
}

export default function SessionSelectionWizard({
  stripeSessionId,
}: SessionSelectionWizardProps) {
  const [packageId, setPackageId] = useState<number | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEnrollmentData = async () => {
      try {
        // Get package ID from Stripe session
        const sessionResponse = await fetch(
          `/api/enrollment/session/${stripeSessionId}`,
          { credentials: "include" }
        );

        if (!sessionResponse.ok) {
          throw new Error("Failed to fetch session data");
        }

        const sessionData = await sessionResponse.json();
        setPackageId(sessionData.packageId);

        // Get steps that need booking
        const stepsResponse = await fetch(
          `/api/students/me/course-packages/${sessionData.packageId}/unbooked-steps`,
          { credentials: "include" }
        );

        if (!stepsResponse.ok) {
          throw new Error("Failed to fetch steps");
        }

        const stepsData = await stepsResponse.json();
        setSteps(stepsData);
      } catch (err) {
        console.error("Error fetching enrollment data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (stripeSessionId) {
      fetchEnrollmentData();
    }
  }, [stripeSessionId]);

  const handleSelectionChange = (stepId: number, optionId: number) => {
    setSelections((prev) => ({ ...prev, [stepId]: optionId }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const selectionsArray = Object.entries(selections).map(
        ([stepId, optionId]) => ({
          courseStepId: parseInt(stepId),
          courseStepOptionId: optionId,
        })
      );

      const response = await fetch(
        `/api/students/me/course-packages/${packageId}/book-sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ selections: selectionsArray }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to book sessions");
      }

      // Success! Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to book sessions. Please try again from your dashboard.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Allow skipping, can book later from dashboard
    window.location.href = "/dashboard";
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayOfWeek];
  };

  if (loading) {
    return <div className="session-wizard loading">Loading your course...</div>;
  }

  const stepsNeedingSelection = steps.filter((step) => step.options.length > 1);
  const allSelected = stepsNeedingSelection.every((step) => selections[step.stepId]);

  return (
    <div className="session-wizard">
      <h2>Book Your Sessions</h2>

      {stepsNeedingSelection.length === 0 ? (
        <div className="session-wizard__success">
          <p>All sessions have been automatically booked!</p>
          <button onClick={() => (window.location.href = "/dashboard")} className="button">
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          <p>Select your preferred time for each session:</p>

          <div className="session-wizard__steps">
            {stepsNeedingSelection.map((step) => (
              <div key={step.stepId} className="wizard-step">
                <h3 className="wizard-step__title">
                  {step.stepLabel}: {step.stepTitle}
                </h3>

                <div className="wizard-step__options">
                  {step.options.map((option) => (
                    <label key={option.courseStepOptionId} className="option-card">
                      <input
                        type="radio"
                        name={`step-${step.stepId}`}
                        value={option.courseStepOptionId}
                        checked={selections[step.stepId] === option.courseStepOptionId}
                        onChange={() =>
                          handleSelectionChange(step.stepId, option.courseStepOptionId)
                        }
                      />
                      <div className="option-card__content">
                        <div className="option-card__name">{option.groupClassName}</div>
                        <div className="option-card__time">
                          {getDayName(option.dayOfWeek)}s at {option.startTime}
                        </div>
                        <div className="option-card__availability">
                          {option.availableSeats} spots available
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="session-wizard__actions">
            <button onClick={handleSkip} className="button button--secondary">
              Book Later
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allSelected || submitting}
              className="button button--primary"
            >
              {submitting ? "Booking..." : "Confirm Selections"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Step 5: Book Sessions API Endpoint

**Already specified in 02-api-endpoints.md**, implementation:

**File:** `/apps/nestjs/src/course-programs/services/course-step-progress.service.ts`

```typescript
async bookSessions(
  studentPackageId: number,
  selections: { courseStepId: number; courseStepOptionId: number }[],
) {
  const studentPackage = await this.packageRepo.findOne({
    where: { id: studentPackageId },
    relations: ['courseProgram', 'courseProgram.steps'],
  });

  if (!studentPackage) {
    throw new NotFoundException('Package not found');
  }

  const autoBooked: number[] = [];
  const manualSelections: number[] = [];
  const booked: StudentCourseStepProgress[] = [];

  await this.dataSource.transaction(async (manager) => {
    // Get cohort from first progress record
    const firstProgress = await manager.findOne(StudentCourseStepProgress, {
      where: { studentPackageId },
    });

    const cohortId = firstProgress.cohortId;

    // Get all cohort sessions
    const cohortSessions = await manager.find(CourseCohortSession, {
      where: { cohortId },
    });

    for (const step of studentPackage.courseProgram.steps) {
      // Find options for this step in the cohort
      const stepOptions = cohortSessions.filter(
        (cs) => cs.courseStepId === step.id,
      );

      let selectedOptionId: number | null = null;

      if (stepOptions.length === 1) {
        // Auto-book single option
        selectedOptionId = stepOptions[0].courseStepOptionId;
        autoBooked.push(step.id);
      } else {
        // Multiple options: check for manual selection
        const selection = selections.find((s) => s.courseStepId === step.id);
        if (selection) {
          selectedOptionId = selection.courseStepOptionId;
          manualSelections.push(step.id);
        } else {
          // No selection yet, leave unbooked
          continue;
        }
      }

      // Book the session
      const option = await manager.findOne(CourseStepOption, {
        where: { id: selectedOptionId },
      });

      // Create session record (if using session table)
      // For now, assume sessionId links to group class instance

      const progress = await manager.findOne(StudentCourseStepProgress, {
        where: { studentPackageId, courseStepId: step.id },
      });

      progress.status = 'BOOKED';
      progress.sessionId = option.groupClassId; // Adjust based on your session model
      progress.bookedAt = new Date();

      await manager.save(progress);
      booked.push(progress);
    }
  });

  return { autoBooked, manualSelections, booked };
}
```

---

## Additional Endpoints Needed

### GET /enrollment/session/:stripeSessionId

**Purpose:** Get package ID from Stripe session (for wizard).

```typescript
@Get('enrollment/session/:sessionId')
@UseGuards(JwtAuthGuard)
async getEnrollmentSession(
  @Param('sessionId') sessionId: string,
  @Req() req: any,
) {
  const session = await this.stripe.checkout.sessions.retrieve(sessionId);

  if (session.metadata.studentId !== req.user.id.toString()) {
    throw new ForbiddenException('Not your session');
  }

  const studentPackage = await this.packageRepo.findOne({
    where: {
      studentId: parseInt(session.metadata.studentId),
      courseProgramId: parseInt(session.metadata.courseProgramId),
    },
  });

  return { packageId: studentPackage.id };
}
```

### GET /students/me/course-packages/:packageId/unbooked-steps

**Purpose:** Get steps needing session selection for wizard.

```typescript
@Get('students/me/course-packages/:packageId/unbooked-steps')
@UseGuards(JwtAuthGuard)
async getUnbookedSteps(
  @Param('packageId') packageId: number,
  @Req() req: any,
) {
  // Verify ownership
  const pkg = await this.packageRepo.findOne({
    where: { id: packageId, studentId: req.user.id },
  });

  if (!pkg) {
    throw new NotFoundException('Package not found');
  }

  // Get cohort from progress
  const progress = await this.progressRepo.find({
    where: { studentPackageId: packageId },
    relations: ['courseStep'],
  });

  const cohortId = progress[0].cohortId;

  // Get steps with multiple options in cohort
  const steps = [];
  for (const prog of progress) {
    if (prog.status === 'UNBOOKED') {
      const options = await this.cohortSessionRepo.find({
        where: { cohortId, courseStepId: prog.courseStepId },
        relations: ['courseStepOption', 'courseStepOption.groupClass'],
      });

      if (options.length > 0) {
        steps.push({
          stepId: prog.courseStepId,
          stepLabel: prog.courseStep.label,
          stepTitle: prog.courseStep.title,
          stepOrder: prog.courseStep.stepOrder,
          options: options.map((opt) => ({
            courseStepOptionId: opt.courseStepOptionId,
            groupClassName: opt.courseStepOption.groupClass.name,
            dayOfWeek: opt.courseStepOption.groupClass.dayOfWeek,
            startTime: opt.courseStepOption.groupClass.startTime,
            endTime: opt.courseStepOption.groupClass.endTime,
            availableSeats:
              opt.courseStepOption.groupClass.maxStudents -
              opt.courseStepOption.groupClass.currentEnrollment,
          })),
        });
      }
    }
  }

  return steps;
}
```

---

## Error Handling & Edge Cases

### Race Condition: Cohort Fills During Checkout

**Problem:** Student starts checkout, cohort fills before payment completes.

**Solution:** Validate in webhook handler:

```typescript
// In handleCheckoutComplete:
const cohort = await manager.findOne(CourseCohort, {
  where: { id: parseInt(cohortId) },
});

if (cohort.currentEnrollment >= cohort.maxEnrollment) {
  // Cohort filled during checkout - refund
  await this.stripe.refunds.create({
    payment_intent: session.payment_intent as string,
    reason: 'requested_by_customer',
  });

  console.error(`Cohort ${cohortId} filled during checkout - refunded`);
  return;
}
```

### Idempotency: Duplicate Webhook Deliveries

**Solution:** Check for existing StudentPackage before creating (already implemented above).

### Session Full During Booking

**Problem:** Student tries to book session that just filled.

**Solution:** Validate in bookSessions:

```typescript
const groupClass = await manager.findOne(GroupClass, {
  where: { id: option.groupClassId },
});

if (groupClass.currentEnrollment >= groupClass.maxStudents) {
  throw new ConflictException(`Session for step ${step.label} is now full`);
}
```

### Student Abandons Wizard

**Solution:** Unbooked steps remain in database with status='UNBOOKED'. Student can book later from dashboard.

---

## Testing Checklist

- [ ] Student can click enroll button
- [ ] Stripe checkout session created correctly
- [ ] Metadata passed to Stripe correctly
- [ ] Webhook processes payment successfully
- [ ] StudentPackage created with correct data
- [ ] StudentCourseStepProgress records seeded
- [ ] Cohort enrollment incremented
- [ ] Success page loads with wizard
- [ ] Wizard displays steps correctly
- [ ] Auto-booking works for single-option steps
- [ ] Manual selection works for multi-option steps
- [ ] Session booking persists correctly
- [ ] "Book Later" button works
- [ ] Edge case: cohort full during checkout
- [ ] Edge case: session full during booking
- [ ] Idempotency: duplicate webhook ignored
- [ ] Student redirected to dashboard after completion

---

## Next Steps

After implementing enrollment flow:
1. Update student dashboard to show enrolled courses (see [06-student-dashboard.md](./06-student-dashboard.md))
2. Add calendar integration (see [07-calendar-integration.md](./07-calendar-integration.md))
3. Test full end-to-end enrollment flow
4. Implement email notifications (out of scope for MVP)
