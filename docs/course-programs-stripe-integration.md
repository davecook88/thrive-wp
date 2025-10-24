# Course Programs: Stripe Integration Plan

## Overview
This document details the Stripe integration for course programs, including product/price creation, webhook handling for purchases and refunds, and bundled credit fulfillment.

---

## Architecture

### Stripe Product Model for Courses

**Course programs are sold as Stripe products with the following structure:**

```typescript
// Stripe Product
{
  id: "prod_xxx",
  object: "product",
  name: "Spanish from Zero - Complete Program",
  description: "8-week structured Spanish course with...",
  metadata: {
    product_type: "course_program",          // Distinguish from packages
    course_program_id: "123",                 // Link to CourseProgram.id
    course_code: "SFZ",                       // Human-readable code
    bundle_summary: "Includes 2 private + 3 group credits" // For display
  }
}

// Stripe Price
{
  id: "price_xxx",
  object: "price",
  product: "prod_xxx",
  unit_amount: 49900,  // $499.00
  currency: "usd",
  metadata: {
    course_program_id: "123"
  }
}
```

---

## Phase 1: Product Creation Service

### Extend Existing Stripe Service

#### Location: `apps/nestjs/src/payments/stripe.service.ts`

**Add methods:**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CourseProgram } from '../course-programs/entities/course-program.entity.js';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  /**
   * Create Stripe product and price for a course program
   */
  async createCourseProduct(
    courseProgram: CourseProgram,
    priceInCents: number,
    currency = 'usd',
    additionalMetadata?: Record<string, string>,
  ): Promise<{ productId: string; priceId: string }> {
    try {
      // Build bundle summary
      const bundleSummary = this.buildBundleSummary(courseProgram);

      // Create Stripe product
      const product = await this.stripe.products.create({
        name: courseProgram.title,
        description: courseProgram.description || undefined,
        metadata: {
          product_type: 'course_program',
          course_program_id: courseProgram.id.toString(),
          course_code: courseProgram.code,
          bundle_summary: bundleSummary,
          ...additionalMetadata,
        },
      });

      // Create Stripe price
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: priceInCents,
        currency,
        metadata: {
          course_program_id: courseProgram.id.toString(),
        },
      });

      return {
        productId: product.id,
        priceId: price.id,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to create Stripe product: ${error.message}`,
      );
    }
  }

  /**
   * Update Stripe product metadata
   */
  async updateCourseProduct(
    productId: string,
    updates: {
      name?: string;
      description?: string;
      metadata?: Record<string, string>;
    },
  ): Promise<Stripe.Product> {
    return this.stripe.products.update(productId, updates);
  }

  /**
   * Create new price for existing product (price updates)
   */
  async createNewCoursePrice(
    productId: string,
    priceInCents: number,
    currency = 'usd',
    courseProgramId: number,
  ): Promise<string> {
    const price = await this.stripe.prices.create({
      product: productId,
      unit_amount: priceInCents,
      currency,
      metadata: {
        course_program_id: courseProgramId.toString(),
      },
    });

    // Archive old default price
    // Note: You'll need to track which price is "default" in your system

    return price.id;
  }

  /**
   * Build human-readable bundle summary
   */
  private buildBundleSummary(courseProgram: CourseProgram): string {
    if (!courseProgram.bundleComponents || courseProgram.bundleComponents.length === 0) {
      return 'No bundled extras';
    }

    const parts: string[] = [];
    const privateCredits = courseProgram.bundleComponents
      .filter((c) => c.componentType === 'PRIVATE_CREDIT')
      .reduce((sum, c) => sum + c.quantity, 0);

    const groupCredits = courseProgram.bundleComponents
      .filter((c) => c.componentType === 'GROUP_CREDIT')
      .reduce((sum, c) => sum + c.quantity, 0);

    if (privateCredits > 0) {
      parts.push(`${privateCredits} private ${privateCredits === 1 ? 'credit' : 'credits'}`);
    }

    if (groupCredits > 0) {
      parts.push(`${groupCredits} group ${groupCredits === 1 ? 'credit' : 'credits'}`);
    }

    return parts.length > 0 ? `Includes ${parts.join(' + ')}` : 'No bundled extras';
  }

  /**
   * Retrieve product by ID
   */
  async getProduct(productId: string): Promise<Stripe.Product> {
    return this.stripe.products.retrieve(productId);
  }

  /**
   * Retrieve price by ID
   */
  async getPrice(priceId: string): Promise<Stripe.Price> {
    return this.stripe.prices.retrieve(priceId);
  }

  /**
   * Archive/deactivate a price
   */
  async archivePrice(priceId: string): Promise<Stripe.Price> {
    return this.stripe.prices.update(priceId, { active: false });
  }
}
```

---

## Phase 2: Publish Flow Integration

### Update CourseProgramsService

#### Location: `apps/nestjs/src/course-programs/services/course-programs.service.ts`

**Implement `publishToStripe` method:**

```typescript
import { StripeService } from '../../payments/stripe.service.js';

@Injectable()
export class CourseProgramsService {
  constructor(
    @InjectRepository(CourseProgram)
    private readonly courseProgramRepo: Repository<CourseProgram>,
    private readonly stripeService: StripeService, // INJECT
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Publish course to Stripe
   */
  async publishToStripe(
    id: number,
    priceInCents: number,
    currency = 'usd',
  ): Promise<CourseProgram> {
    const courseProgram = await this.findOneOrFail(id, true);

    // Validation: ensure course has at least one step with options
    if (!courseProgram.steps || courseProgram.steps.length === 0) {
      throw new BadRequestException('Course must have at least one step before publishing');
    }

    const stepsWithOptions = courseProgram.steps.filter(
      (step) => step.stepOptions && step.stepOptions.length > 0,
    );

    if (stepsWithOptions.length === 0) {
      throw new BadRequestException(
        'Course must have at least one step with class options before publishing',
      );
    }

    // Create or update Stripe product
    if (courseProgram.stripeProductId) {
      // Update existing product
      await this.stripeService.updateCourseProduct(courseProgram.stripeProductId, {
        name: courseProgram.title,
        description: courseProgram.description || undefined,
      });

      // Create new price (prices are immutable)
      const newPriceId = await this.stripeService.createNewCoursePrice(
        courseProgram.stripeProductId,
        priceInCents,
        currency,
        courseProgram.id,
      );

      // Archive old price if exists
      if (courseProgram.stripePriceId) {
        await this.stripeService.archivePrice(courseProgram.stripePriceId);
      }

      courseProgram.stripePriceId = newPriceId;
    } else {
      // Create new product and price
      const { productId, priceId } = await this.stripeService.createCourseProduct(
        courseProgram,
        priceInCents,
        currency,
      );

      courseProgram.stripeProductId = productId;
      courseProgram.stripePriceId = priceId;
    }

    return this.courseProgramRepo.save(courseProgram);
  }
}
```

---

## Phase 3: Webhook Handler

### Extend Webhook Controller

#### Location: `apps/nestjs/src/payments/webhooks.controller.ts`

**Add course program purchase handling:**

```typescript
import { Controller, Post, Headers, RawBodyRequest, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { StripeService } from './stripe.service.js';
import { CourseEnrollmentsService } from '../course-programs/services/course-enrollments.service.js';
import { PackagesService } from '../packages/packages.service.js';

@Controller('webhooks/stripe')
export class WebhooksController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly enrollmentsService: CourseEnrollmentsService,
    private readonly packagesService: PackagesService,
  ) {}

  @Post()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    const event = this.stripeService.constructEvent(
      request.rawBody,
      signature,
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await this.handleRefund(event.data.object as Stripe.Charge);
        break;

      // ... other event types
    }

    return { received: true };
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const { metadata } = paymentIntent;

    // Determine product type
    const productType = metadata.product_type;

    if (productType === 'course_program') {
      await this.handleCoursePurchase(paymentIntent);
    } else if (productType === 'package') {
      await this.handlePackagePurchase(paymentIntent);
    } else {
      throw new BadRequestException(`Unknown product type: ${productType}`);
    }
  }

  /**
   * Handle course program purchase
   */
  private async handleCoursePurchase(paymentIntent: Stripe.PaymentIntent) {
    const { metadata } = paymentIntent;
    const courseProgramId = parseInt(metadata.course_program_id);
    const studentId = parseInt(metadata.student_id);

    // Get price details
    const lineItems = paymentIntent.metadata.line_items
      ? JSON.parse(paymentIntent.metadata.line_items)
      : [];

    const coursePriceId = lineItems[0]?.price_id;

    // Create enrollment and seed progress
    const enrollment = await this.enrollmentsService.createEnrollment(
      studentId,
      courseProgramId,
      paymentIntent.id,
      metadata.product_id,
      coursePriceId,
    );

    // Issue bundled credits
    await this.issueBundledCredits(courseProgramId, studentId, paymentIntent.id);

    // TODO: Send confirmation email
    // TODO: Log analytics event
  }

  /**
   * Issue bundled credits from course purchase
   */
  private async issueBundledCredits(
    courseProgramId: number,
    studentId: number,
    paymentIntentId: string,
  ) {
    // Get course program with bundle components
    const courseProgram = await this.courseProgramsService.findOneOrFail(
      courseProgramId,
      true,
    );

    if (!courseProgram.bundleComponents || courseProgram.bundleComponents.length === 0) {
      return; // No bundled credits
    }

    // Issue each bundle component as a StudentPackage
    for (const component of courseProgram.bundleComponents) {
      if (component.componentType === 'PRIVATE_CREDIT') {
        await this.packagesService.createPackageForStudent({
          studentId,
          serviceType: 'PRIVATE',
          tierName: component.metadata?.tierName || 'Standard', // From component metadata
          totalCredits: component.quantity,
          remainingCredits: component.quantity,
          stripePaymentIntentId: paymentIntentId,
          source: 'course_bundle',
          sourceId: courseProgramId.toString(),
        });
      } else if (component.componentType === 'GROUP_CREDIT') {
        await this.packagesService.createPackageForStudent({
          studentId,
          serviceType: 'GROUP',
          tierName: component.metadata?.tierName || 'Standard',
          totalCredits: component.quantity,
          remainingCredits: component.quantity,
          stripePaymentIntentId: paymentIntentId,
          source: 'course_bundle',
          sourceId: courseProgramId.toString(),
        });
      }
    }
  }

  /**
   * Handle refund
   */
  private async handleRefund(charge: Stripe.Charge) {
    const { payment_intent, metadata } = charge;

    // Get payment intent to access metadata
    const paymentIntent = await this.stripeService.getPaymentIntent(
      payment_intent as string,
    );

    const productType = paymentIntent.metadata.product_type;

    if (productType === 'course_program') {
      await this.handleCourseRefund(paymentIntent);
    } else if (productType === 'package') {
      await this.handlePackageRefund(paymentIntent);
    }
  }

  /**
   * Handle course program refund
   */
  private async handleCourseRefund(paymentIntent: Stripe.PaymentIntent) {
    const courseProgramId = parseInt(paymentIntent.metadata.course_program_id);
    const studentId = parseInt(paymentIntent.metadata.student_id);

    // Find enrollment
    const enrollment = await this.enrollmentsService.getEnrollmentStatus(
      studentId,
      courseProgramId,
    );

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found for refund');
    }

    // Process refund (revokes enrollment and deallocates unused credits)
    await this.enrollmentsService.processRefund(enrollment.id);

    // Revoke bundled credits
    await this.revokeBundledCredits(courseProgramId, studentId, paymentIntent.id);

    // TODO: Send refund confirmation email
  }

  /**
   * Revoke bundled credits from refunded course
   */
  private async revokeBundledCredits(
    courseProgramId: number,
    studentId: number,
    paymentIntentId: string,
  ) {
    // Find packages issued from this course purchase
    const packages = await this.packagesService.findBySource(
      'course_bundle',
      courseProgramId.toString(),
    );

    for (const pkg of packages) {
      if (pkg.studentId === studentId && pkg.stripePaymentIntentId === paymentIntentId) {
        // Only revoke if credits haven't been used
        if (pkg.remainingCredits === pkg.totalCredits) {
          await this.packagesService.deactivatePackage(pkg.id);
        } else {
          // Partial use - log warning but don't revoke
          console.warn(
            `Cannot fully revoke package ${pkg.id} - ${pkg.totalCredits - pkg.remainingCredits} credits used`,
          );
        }
      }
    }
  }
}
```

---

## Phase 4: Checkout Session Creation

### Create Checkout for Course Purchase

**Add method to StripeService:**

```typescript
/**
 * Create checkout session for course purchase
 */
async createCourseCheckoutSession(
  courseProgram: CourseProgram,
  studentId: number,
  studentEmail: string,
  successUrl: string,
  cancelUrl: string,
): Promise<Stripe.Checkout.Session> {
  if (!courseProgram.stripePriceId) {
    throw new BadRequestException('Course has not been published to Stripe');
  }

  return this.stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: studentEmail,
    line_items: [
      {
        price: courseProgram.stripePriceId,
        quantity: 1,
      },
    ],
    payment_intent_data: {
      metadata: {
        product_type: 'course_program',
        course_program_id: courseProgram.id.toString(),
        course_code: courseProgram.code,
        student_id: studentId.toString(),
      },
    },
    metadata: {
      product_type: 'course_program',
      course_program_id: courseProgram.id.toString(),
      student_id: studentId.toString(),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}
```

**Add endpoint to trigger checkout:**

```typescript
// In course-programs.controller.ts

@Post(':id/checkout')
@UseGuards(JwtAuthGuard, StudentGuard)
async createCheckout(
  @Param('id', ParseIntPipe) courseProgramId: number,
  @CurrentUser() user: User,
  @Body() body: { successUrl: string; cancelUrl: string },
) {
  const student = await this.studentsService.findOneByUserId(user.id);
  const courseProgram = await this.courseProgramsService.findOneOrFail(courseProgramId);

  // Check if already enrolled
  const isEnrolled = await this.enrollmentsService.isEnrolled(student.id, courseProgramId);
  if (isEnrolled) {
    throw new BadRequestException('You are already enrolled in this course');
  }

  const session = await this.stripeService.createCourseCheckoutSession(
    courseProgram,
    student.id,
    user.email,
    body.successUrl,
    body.cancelUrl,
  );

  return { checkoutUrl: session.url };
}
```

---

## Phase 5: Bundled Credits Integration

### Update PackagesService

**Add methods for course bundles:**

```typescript
// In packages.service.ts

/**
 * Create package for student (used by course bundle fulfillment)
 */
async createPackageForStudent(data: {
  studentId: number;
  serviceType: 'PRIVATE' | 'GROUP';
  tierName: string;
  totalCredits: number;
  remainingCredits: number;
  stripePaymentIntentId: string;
  source: string;
  sourceId: string;
}): Promise<StudentPackage> {
  const studentPackage = this.studentPackageRepo.create({
    studentId: data.studentId,
    serviceType: data.serviceType,
    tierName: data.tierName,
    totalCredits: data.totalCredits,
    remainingCredits: data.remainingCredits,
    expiresAt: this.calculateExpiration(), // Your existing logic
    stripePaymentIntentId: data.stripePaymentIntentId,
    metadata: {
      source: data.source,
      sourceId: data.sourceId,
    },
  });

  return this.studentPackageRepo.save(studentPackage);
}

/**
 * Find packages by source (for revocation on refund)
 */
async findBySource(source: string, sourceId: string): Promise<StudentPackage[]> {
  return this.studentPackageRepo
    .createQueryBuilder('sp')
    .where("JSON_EXTRACT(sp.metadata, '$.source') = :source", { source })
    .andWhere("JSON_EXTRACT(sp.metadata, '$.sourceId') = :sourceId", { sourceId })
    .getMany();
}

/**
 * Deactivate package (for refunds)
 */
async deactivatePackage(packageId: number): Promise<void> {
  await this.studentPackageRepo.softRemove({ id: packageId });
}
```

---

## Phase 6: Testing

### Webhook Testing with Stripe CLI

**Setup:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/stripe
```

**Trigger test events:**
```bash
# Test course purchase
stripe trigger payment_intent.succeeded \
  --add payment_intent:metadata[product_type]=course_program \
  --add payment_intent:metadata[course_program_id]=1 \
  --add payment_intent:metadata[student_id]=1

# Test refund
stripe trigger charge.refunded
```

---

## Implementation Checklist

### Product Creation
- [ ] Add `createCourseProduct()` to StripeService
- [ ] Add `updateCourseProduct()` to StripeService
- [ ] Add `createNewCoursePrice()` to StripeService
- [ ] Implement `buildBundleSummary()` helper
- [ ] Complete `publishToStripe()` in CourseProgramsService
- [ ] Add validation for publishing (steps + options required)

### Webhook Handling
- [ ] Add `handleCoursePurchase()` to webhook handler
- [ ] Add `issueBundledCredits()` method
- [ ] Add `handleCourseRefund()` to webhook handler
- [ ] Add `revokeBundledCredits()` method
- [ ] Implement idempotency checks (duplicate webhook prevention)
- [ ] Add webhook event logging

### Checkout Flow
- [ ] Add `createCourseCheckoutSession()` to StripeService
- [ ] Add `POST /course-programs/:id/checkout` endpoint
- [ ] Add duplicate enrollment check before checkout
- [ ] Test checkout flow end-to-end

### Bundled Credits
- [ ] Add `createPackageForStudent()` to PackagesService
- [ ] Add `findBySource()` to PackagesService
- [ ] Add `deactivatePackage()` to PackagesService
- [ ] Test credit issuance on purchase
- [ ] Test credit revocation on refund

### Testing
- [ ] Write unit tests for Stripe service methods
- [ ] Write webhook handler tests with mock events
- [ ] Test full purchase → enrollment → credits flow
- [ ] Test refund → enrollment cancellation → credit revocation
- [ ] Test with Stripe CLI in development
- [ ] Verify idempotency with duplicate webhook sends

---

## Security Considerations

### Webhook Signature Verification
```typescript
// In StripeService
constructEvent(payload: Buffer, signature: string): Stripe.Event {
  const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

  try {
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
  }
}
```

### Idempotency
- Store processed `payment_intent.id` to prevent duplicate fulfillment
- Use database constraints (UNIQUE on `stripe_payment_intent_id`)
- Log all webhook events with timestamps

### Metadata Validation
- Always validate metadata presence before parsing
- Handle missing or malformed metadata gracefully
- Log warnings for unexpected metadata formats

---

## Error Handling

### Common Scenarios

**1. Student already enrolled:**
```typescript
// Check before creating enrollment
const existing = await this.enrollmentRepo.findOne({
  where: { studentId, courseProgramId, status: 'ACTIVE' }
});

if (existing) {
  // Log event and return success (idempotent)
  console.warn(`Student ${studentId} already enrolled in course ${courseProgramId}`);
  return;
}
```

**2. Course not found during webhook:**
```typescript
try {
  const courseProgram = await this.courseProgramsService.findOneOrFail(courseProgramId);
} catch (error) {
  // Log error and notify admin
  console.error(`Course program ${courseProgramId} not found during webhook processing`);
  // Don't throw - webhook will retry indefinitely
  // Instead, send alert to admin
  await this.alertService.notifyAdmin('Course not found in webhook', { courseProgramId });
}
```

**3. Partial credit revocation on refund:**
```typescript
if (pkg.remainingCredits < pkg.totalCredits) {
  // Credits partially used - log but don't revoke
  console.warn(`Package ${pkg.id} partially used (${pkg.totalCredits - pkg.remainingCredits} credits consumed)`);

  // Optionally: partial refund calculation
  const unusedValue = (pkg.remainingCredits / pkg.totalCredits) * totalPaidAmount;
  // Process partial refund...
}
```

---

## Next Steps

After Stripe integration:
1. Update booking service to handle course sessions
2. Build WordPress checkout flow
3. Create student dashboard for course progress
4. Implement admin UI for course management
