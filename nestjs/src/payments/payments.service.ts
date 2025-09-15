import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import { Student } from '../students/entities/student.entity.js';
import { StripeProductMap } from './entities/stripe-product-map.entity.js';
import {
  Session,
  SessionStatus,
  SessionVisibility,
} from '../sessions/entities/session.entity.js';
import { Booking, BookingStatus } from './entities/booking.entity.js';
import {
  ServiceType,
  serviceTypeToServiceKey,
} from '../common/types/class-types.js';
import {
  StripeMetadataUtils,
  ParsedStripeMetadata,
} from './dto/stripe-metadata.dto.js';
import { SessionsService } from '../sessions/services/sessions.service.js';
import { PackagesService } from '../packages/packages.service.js';
import { StudentPackage } from '../packages/entities/student-package.entity.js';
import { PackageUse } from '../packages/entities/package-use.entity.js';

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  publishableKey: string;
  amountMinor: number;
  currency: string;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StripeProductMap)
    private stripeProductMapRepository: Repository<StripeProductMap>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(StudentPackage)
    private studentPackageRepository: Repository<StudentPackage>,
    @InjectRepository(PackageUse)
    private packageUseRepository: Repository<PackageUse>,
    private configService: ConfigService,
    private sessionsService: SessionsService,
    private packagesService: PackagesService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey) {
      throw new Error('Stripe secret key is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }

  /**
   * Create a booking using an existing student package credit (no Stripe/payment)
   * Returns the created booking record.
   */
  async bookWithPackage(
    studentUserId: number,
    packageId: number,
    sessionId: number,
  ) {
    // Resolve student.id from userId
    const student = await this.studentRepository.findOne({
      where: { userId: studentUserId },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Use package (decrement + create package_use)
    const { package: pkg, use } =
      await this.packagesService.usePackageForSession(
        student.id,
        packageId,
        sessionId,
        student.id,
      );

    // Create booking referencing package
    const booking = this.bookingRepository.create({
      sessionId,
      studentId: student.id,
      status: BookingStatus.CONFIRMED,
      acceptedAt: new Date(),
      studentPackageId: pkg.id,
      creditsCost: 1,
    });

    const saved = await this.bookingRepository.save(booking);

    // Link package_use.booking_id to created booking (best effort)
    try {
      await this.packagesService.linkUseToBooking(use.id, saved.id);
    } catch (e) {
      // log but don't fail booking
      console.warn('Failed to link package use to booking', e);
    }

    return saved;
  }

  async createPaymentIntent(
    createPaymentIntentDto: CreatePaymentIntentDto,
    userId: number,
  ): Promise<CreatePaymentIntentResponse> {
    // Use the service key based on the service type
    const serviceKey = serviceTypeToServiceKey(
      createPaymentIntentDto.serviceType,
    );
    const quantity = 1; // All individual bookings are quantity 1

    // Look up the product mapping in the database
    const productMapping = await this.stripeProductMapRepository.findOne({
      where: {
        serviceKey,
        active: true,
      },
    });

    if (!productMapping) {
      throw new BadRequestException(
        `No active product mapping found for ${serviceKey}. Please contact support.`,
      );
    }

    // Get the student record
    const student = await this.studentRepository.findOne({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student record not found for user ${userId}`,
      );
    }

    // Validate teacher availability for private sessions
    if (createPaymentIntentDto.serviceType === ServiceType.PRIVATE) {
      await this.sessionsService.validatePrivateSession({
        teacherId: createPaymentIntentDto.teacher,
        startAt: createPaymentIntentDto.start,
        endAt: createPaymentIntentDto.end,
        studentId: student.id,
      });
    }

    // Get the default active price for this product from Stripe
    const prices = await this.stripe.prices.list({
      product: productMapping.stripeProductId,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      throw new BadRequestException(
        'No active price found for one-to-one classes. Please contact support.',
      );
    }

    const stripePrice = prices.data[0];
    const unitAmount = stripePrice.unit_amount || 0;
    const currency = stripePrice.currency;

    // Calculate totals
    const subtotalMinor = unitAmount * quantity;
    const totalMinor = subtotalMinor; // Phase 1: no discounts or tax

    // Create or get Stripe customer
    let stripeCustomerId = student.stripeCustomerId;
    if (!stripeCustomerId) {
      const customerMetadata = StripeMetadataUtils.createCustomerMetadata({
        userId,
        studentId: student.id,
      });

      const customer = await this.stripe.customers.create({
        metadata: StripeMetadataUtils.toStripeFormat(customerMetadata),
      });
      stripeCustomerId = customer.id;

      // Update student with Stripe customer ID
      student.stripeCustomerId = stripeCustomerId;
      await this.studentRepository.save(student);
    }

    // Create Stripe PaymentIntent
    const paymentIntentMetadata =
      StripeMetadataUtils.createPaymentIntentMetadata({
        studentId: student.id,
        userId,
        serviceType: createPaymentIntentDto.serviceType,
        teacherId: createPaymentIntentDto.teacher,
        startAt: createPaymentIntentDto.start,
        endAt: createPaymentIntentDto.end,
        productId: productMapping.stripeProductId,
        priceId: stripePrice.id,
        notes: createPaymentIntentDto.notes,
      });

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: totalMinor,
      currency,
      customer: stripeCustomerId,
      metadata: StripeMetadataUtils.toStripeFormat(paymentIntentMetadata),
    });

    const publishableKey =
      this.configService.get<string>('stripe.publishableKey') ||
      'pk_test_placeholder';

    if (!publishableKey || publishableKey === 'pk_test_placeholder') {
      console.warn(
        'STRIPE_PUBLISHABLE_KEY environment variable not set. Please configure it for production.',
      );
    }

    return {
      clientSecret: paymentIntent.client_secret as string,
      publishableKey,
      amountMinor: totalMinor,
      currency,
    };
  }

  async createProductMapping(
    serviceKey: string,
    stripeProductId: string,
  ): Promise<StripeProductMap> {
    // Check if mapping already exists
    const existing = await this.stripeProductMapRepository.findOne({
      where: { serviceKey },
    });

    if (existing) {
      throw new BadRequestException(
        `Product mapping for ${serviceKey} already exists`,
      );
    }

    // Verify the product exists in Stripe
    try {
      await this.stripe.products.retrieve(stripeProductId);
    } catch (error) {
      throw new BadRequestException(
        `Stripe product ${stripeProductId} not found`,
      );
    }

    // Create the mapping record
    const mapping = this.stripeProductMapRepository.create({
      serviceKey,
      stripeProductId,
      active: true,
      scopeType: 'session' as any,
      metadata: {
        description: `Product mapping for ${serviceKey}`,
      },
    });

    return await this.stripeProductMapRepository.save(mapping);
  }

  async constructStripeEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<Stripe.Event> {
    const webhookSecret = this.configService.get<string>(
      'stripe.webhookSecret',
    );
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }

  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object);
        break;
      // Add more event types as needed
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    console.log('Handling payment_intent.succeeded event');
    const metadata: ParsedStripeMetadata = StripeMetadataUtils.fromStripeFormat(
      paymentIntent.metadata || {},
    );

    // Check if this is a package purchase by looking for price_id and product_id
    const isPackagePurchase = metadata.price_id && metadata.product_id;

    if (isPackagePurchase) {
      // Handle package purchase workflow
      await this.handlePackagePurchase(paymentIntent, metadata);
    } else if (metadata.session_id && metadata.booking_id) {
      // If draft session/booking already created (session_id + booking_id present), promote them
      const sessionId = parseInt(String(metadata.session_id), 10);
      const bookingId = parseInt(String(metadata.booking_id), 10);
      try {
        await this.sessionRepository.manager.transaction(async (tx) => {
          const session = await tx.findOne(Session, {
            where: { id: sessionId },
          });
          if (session && session.status === SessionStatus.DRAFT) {
            session.status = SessionStatus.SCHEDULED;
            await tx.save(Session, session);
          }
          const booking = await tx.findOne(Booking, {
            where: { id: bookingId },
          });
          if (booking && booking.status === BookingStatus.PENDING) {
            booking.status = BookingStatus.CONFIRMED;
            booking.acceptedAt = new Date();
            await tx.save(Booking, booking);
          }
        });
        console.log(
          `Promoted draft session ${sessionId} & booking ${bookingId} after successful payment`,
        );
      } catch (e) {
        console.error('Error promoting draft session/booking:', e);
      }
    } else {
      // Legacy path: create session + booking from metadata
      await this.createSessionAndBookingFromMetadata(metadata);
    }
  }

  private async handlePackagePurchase(
    paymentIntent: Stripe.PaymentIntent,
    metadata: ParsedStripeMetadata,
  ): Promise<void> {
    console.log('Handling package purchase from payment_intent.succeeded');

    // Get package details from Stripe price
    const priceId = String(metadata.price_id);
    const productId = String(metadata.product_id);
    const stripePrice = await this.stripe.prices.retrieve(priceId);
    const stripeProduct = await this.stripe.products.retrieve(productId);

    // Extract package metadata
    const packageMetadata = stripeProduct.metadata || {};
    const credits = parseInt(packageMetadata.credits || '0', 10);
    const expiresInDays = parseInt(packageMetadata.expires_in_days || '0', 10);

    if (credits <= 0) {
      console.error('Package has no credits defined:', packageMetadata);
      return;
    }

    const userId = parseInt(String(metadata.user_id), 10);
    const sessionId = metadata.session_id
      ? parseInt(String(metadata.session_id), 10)
      : null;

    // Find the student record
    const student = await this.studentRepository.findOne({
      where: { userId },
    });

    if (!student) {
      console.error(`Student not found for user ${userId}`);
      return;
    }

    try {
      // Use a transaction to ensure atomicity and prevent race conditions
      await this.studentRepository.manager.transaction(async (tx) => {
        // Check if package already exists for this payment (idempotency protection)
        const existingPackage = await tx.findOne(StudentPackage, {
          where: { sourcePaymentId: paymentIntent.id },
        });

        let savedPackage: StudentPackage;
        if (existingPackage) {
          console.log(
            `Package already exists for payment ${paymentIntent.id}, webhook duplicate/retry detected`,
          );
          savedPackage = existingPackage;
        } else {
          // 1. Create the student package record
          const expiresAt =
            expiresInDays > 0
              ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
              : null;

          const studentPackage = tx.create(StudentPackage, {
            studentId: student.id,
            packageName: stripeProduct.name,
            totalSessions: credits,
            remainingSessions: credits,
            purchasedAt: new Date(),
            expiresAt,
            sourcePaymentId: paymentIntent.id,
            metadata: {
              stripeProductId: stripeProduct.id,
              stripePriceId: stripePrice.id,
              amountPaid: paymentIntent.amount_received,
              currency: paymentIntent.currency,
            },
          });

          savedPackage = await tx.save(StudentPackage, studentPackage);
          console.log(
            `Created student package ${savedPackage.id} with ${credits} credits`,
          );
        }

        // 2. If there's a session to book, use the package credit immediately
        if (sessionId) {
          // Lock the session to prevent race conditions
          const session = await tx.findOne(Session, {
            where: { id: sessionId },
            lock: { mode: 'pessimistic_write' },
          });

          if (!session) {
            console.error(`Session ${sessionId} not found for package booking`);
            return;
          }

          if (session.status !== SessionStatus.DRAFT) {
            console.error(
              `Session ${sessionId} is not in DRAFT status, cannot book with package`,
            );
            return;
          }

          // Decrement the package credits manually within the same transaction
          savedPackage.remainingSessions = savedPackage.remainingSessions - 1;
          await tx.save(StudentPackage, savedPackage);

          // Create package use record
          const packageUse = tx.create(PackageUse, {
            studentPackageId: savedPackage.id,
            sessionId,
            usedAt: new Date(),
            usedBy: student.id,
          });
          const savedPackageUse = await tx.save(PackageUse, packageUse);

          // Find existing booking (any status) to prevent duplicates
          const existingBooking = await tx.findOne(Booking, {
            where: {
              sessionId,
              studentId: student.id,
            },
          });

          let savedBooking: Booking;
          if (existingBooking) {
            if (existingBooking.status === BookingStatus.DRAFT) {
              // Update existing draft booking to confirmed status with package info
              existingBooking.status = BookingStatus.CONFIRMED;
              existingBooking.acceptedAt = new Date();
              existingBooking.studentPackageId = savedPackage.id;
              existingBooking.creditsCost = 1;
              savedBooking = await tx.save(Booking, existingBooking);
              console.log(
                `Updated existing draft booking ${savedBooking.id} to confirmed status using package credit`,
              );
            } else {
              // Booking already exists and is confirmed - webhook duplicate/retry
              console.log(
                `Booking already exists for session ${sessionId} and student ${student.id} with status ${existingBooking.status}, skipping creation`,
              );
              savedBooking = existingBooking;
            }
          } else {
            // Create new confirmed booking using credits
            const booking = tx.create(Booking, {
              sessionId,
              studentId: student.id,
              status: BookingStatus.CONFIRMED,
              acceptedAt: new Date(),
              studentPackageId: savedPackage.id,
              creditsCost: 1,
            });
            savedBooking = await tx.save(Booking, booking);
            console.log(
              `Created new confirmed booking ${savedBooking.id} using package credit`,
            );
          }

          // Link the package use to the booking
          savedPackageUse.bookingId = savedBooking.id;
          await tx.save(PackageUse, savedPackageUse);

          // Update session status
          session.status = SessionStatus.SCHEDULED;
          await tx.save(Session, session);

          console.log(
            `Created booking ${savedBooking.id} using package credit`,
          );
        }
      });

      console.log(`Successfully processed package purchase for user ${userId}`);
    } catch (error) {
      console.error('Error processing package purchase:', error);
      throw error;
    }
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    // For now, we only log failures; fulfillment is driven by success events.
    console.warn(
      `Payment failed for intent ${paymentIntent.id}: ${paymentIntent.last_payment_error?.message}`,
    );
    const metadata: ParsedStripeMetadata = StripeMetadataUtils.fromStripeFormat(
      paymentIntent.metadata || {},
    );
    if (metadata.session_id && metadata.booking_id) {
      const sessionId = parseInt(String(metadata.session_id), 10);
      const bookingId = parseInt(String(metadata.booking_id), 10);
      try {
        await this.sessionRepository.manager.transaction(async (tx) => {
          const session = await tx.findOne(Session, {
            where: { id: sessionId },
          });
          if (session && session.status === SessionStatus.DRAFT) {
            session.status = SessionStatus.CANCELLED;
            await tx.save(Session, session);
          }
          const booking = await tx.findOne(Booking, {
            where: { id: bookingId },
          });
          if (booking && booking.status === BookingStatus.PENDING) {
            booking.status = BookingStatus.CANCELLED;
            booking.cancelledAt = new Date();
            booking.cancellationReason = 'Payment failed';
            await tx.save(Booking, booking);
          }
        });
        console.log(
          `Cancelled draft session ${sessionId} & booking ${bookingId} after failed payment`,
        );
      } catch (e) {
        console.error('Error cancelling draft session/booking:', e);
      }
    }
  }

  private async createSessionAndBookingFromMetadata(
    metadata: ParsedStripeMetadata,
  ): Promise<void> {
    try {
      // Determine student from metadata
      const studentIdRaw = metadata.student_id;
      if (!studentIdRaw) {
        console.error('Stripe metadata missing student_id; cannot fulfill');
        return;
      }

      const studentId =
        typeof studentIdRaw === 'string'
          ? parseInt(studentIdRaw, 10)
          : (studentIdRaw as number);

      const serviceType = metadata.service_type as ServiceType;

      let sessionId: number;

      // Handle session creation vs. existing session lookup
      if (metadata.session_id) {
        // For GROUP and COURSE sessions: session already exists, just create booking
        sessionId = parseInt(String(metadata.session_id), 10);

        // Verify the session exists and is appropriate for this service type
        const existingSession = await this.sessionRepository.findOne({
          where: { id: sessionId },
        });

        if (!existingSession) {
          console.error(`Session ${sessionId} not found or has been deleted`);
          return;
        }

        if (existingSession.type !== serviceType) {
          console.error(
            `Session type mismatch: expected ${serviceType}, got ${existingSession.type}`,
          );
          return;
        }

        console.log(
          `Using existing ${serviceType} session ${sessionId} for student ${studentId}`,
        );
      } else {
        // For PRIVATE sessions: create new session (existing behavior)
        if (serviceType !== ServiceType.PRIVATE) {
          console.error(
            `Cannot create ${serviceType} session without existing session_id`,
          );
          return;
        }

        // Validate availability before creating session
        try {
          await this.sessionsService.validatePrivateSession({
            teacherId: parseInt(String(metadata.teacher_id), 10),
            startAt: String(metadata.start_at),
            endAt: String(metadata.end_at),
            studentId,
          });
        } catch (error) {
          console.error(
            `Availability validation failed for PRIVATE session: ${error.message}`,
          );
          return;
        }

        // Use transaction to atomically create session and booking
        const result = await this.sessionRepository.manager.transaction(
          async (transactionalEntityManager) => {
            // Create session
            const session = transactionalEntityManager.create(Session, {
              type: ServiceType.PRIVATE,
              teacherId: parseInt(String(metadata.teacher_id), 10),
              startAt: new Date(String(metadata.start_at)),
              endAt: new Date(String(metadata.end_at)),
              capacityMax: 1, // Private sessions have capacity of 1
              status: SessionStatus.SCHEDULED,
              visibility: SessionVisibility.PRIVATE,
              requiresEnrollment: false,
              sourceTimezone: 'UTC', // Store in UTC
            });

            const savedSession = await transactionalEntityManager.save(
              Session,
              session,
            );

            // Create booking immediately after session creation
            const booking = transactionalEntityManager.create(Booking, {
              sessionId: savedSession.id,
              studentId,
              status: BookingStatus.CONFIRMED,
              acceptedAt: new Date(),
            });

            await transactionalEntityManager.save(Booking, booking);

            return { session: savedSession, booking };
          },
        );

        sessionId = result.session.id;

        console.log(
          `Created new PRIVATE session ${sessionId} and booking for student ${studentId} in single transaction`,
        );
      }

      // For GROUP/COURSE sessions, create booking only (session already exists)
      if (metadata.session_id) {
        // Use transaction for booking creation to ensure consistency
        await this.sessionRepository.manager.transaction(
          async (transactionalEntityManager) => {
            const booking = transactionalEntityManager.create(Booking, {
              sessionId,
              studentId,
              status: BookingStatus.CONFIRMED,
              acceptedAt: new Date(),
            });

            await transactionalEntityManager.save(Booking, booking);
          },
        );

        console.log(
          `Created booking for existing ${serviceType} session ${sessionId} and student ${studentId}`,
        );
      }
    } catch (error) {
      console.error('Error creating session and booking from intent:', error);
      // Don't throw - we don't want webhook processing to fail
    }
  }

  // Cache for Stripe publishable key (unlikely to change)
  private cachedPublishableKey: string | null = null;

  getStripePublishableKey(): { publishableKey: string } {
    if (!this.cachedPublishableKey) {
      const key = this.configService.get<string>('stripe.publishableKey');
      if (!key) {
        throw new Error('Stripe publishable key is not configured');
      }
      this.cachedPublishableKey = key;
    }
    return { publishableKey: this.cachedPublishableKey };
  }

  async createPaymentSession(
    priceId: string,
    bookingData: any,
    userId: number,
  ): Promise<{ clientSecret: string }> {
    // Get the student record
    const student = await this.studentRepository.findOne({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student record not found for user ${userId}`,
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = student.stripeCustomerId;
    if (!stripeCustomerId) {
      const customerMetadata = StripeMetadataUtils.createCustomerMetadata({
        userId,
        studentId: student.id,
      });

      const customer = await this.stripe.customers.create({
        metadata: StripeMetadataUtils.toStripeFormat(customerMetadata),
      });
      stripeCustomerId = customer.id;

      // Update student with Stripe customer ID
      student.stripeCustomerId = stripeCustomerId;
      await this.studentRepository.save(student);
    }

    // Get the price details from Stripe
    const stripePrice = await this.stripe.prices.retrieve(priceId);

    if (!stripePrice.active) {
      throw new BadRequestException('Selected package is no longer available');
    }

    // Validate availability before creating draft (private sessions only for now)
    try {
      await this.sessionsService.validatePrivateSession({
        teacherId: parseInt(bookingData.teacher) || 0,
        startAt: bookingData.start,
        endAt: bookingData.end,
        studentId: student.id,
      });
    } catch (e) {
      throw new BadRequestException(
        `Availability validation failed: ${e.message}`,
      );
    }

    // Create draft session + pending booking inside a transaction
    const { sessionId, bookingId } =
      await this.sessionRepository.manager.transaction(async (tx) => {
        const draftSession = tx.create(Session, {
          type: ServiceType.PRIVATE,
          teacherId: parseInt(bookingData.teacher) || 0,
          startAt: new Date(bookingData.start),
          endAt: new Date(bookingData.end),
          capacityMax: 1,
          status: SessionStatus.DRAFT,
          visibility: SessionVisibility.PRIVATE,
          requiresEnrollment: false,
          sourceTimezone: 'UTC',
        });
        const savedSession = await tx.save(Session, draftSession);

        const pendingBooking = tx.create(Booking, {
          sessionId: savedSession.id,
          studentId: student.id,
          status: BookingStatus.PENDING,
          invitedAt: new Date(),
        });
        const savedBooking = await tx.save(Booking, pendingBooking);

        return { sessionId: savedSession.id, bookingId: savedBooking.id };
      });

    // Create PaymentIntent referencing draft records
    const paymentIntentMetadata =
      StripeMetadataUtils.createPaymentIntentMetadata({
        studentId: student.id,
        userId,
        serviceType: ServiceType.PRIVATE, // All treated as packages
        teacherId: parseInt(bookingData.teacher) || 0,
        startAt: bookingData.start || '',
        endAt: bookingData.end || '',
        productId: stripePrice.product as string,
        priceId: stripePrice.id,
        notes: `Package purchase - ${JSON.stringify(bookingData)}`,
        source: 'booking-confirmation',
      });
    // Inject draft IDs
    (paymentIntentMetadata as any).session_id = sessionId.toString();
    (paymentIntentMetadata as any).booking_id = bookingId.toString();

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: stripePrice.unit_amount || 0,
      currency: stripePrice.currency,
      customer: stripeCustomerId,
      metadata: StripeMetadataUtils.toStripeFormat(paymentIntentMetadata),
      automatic_payment_methods: { enabled: true },
    });

    if (!paymentIntent.client_secret) {
      throw new BadRequestException('Failed to create payment session');
    }

    return { clientSecret: paymentIntent.client_secret };
  }
}
