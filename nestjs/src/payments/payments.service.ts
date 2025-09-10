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
    private configService: ConfigService,
    private sessionsService: SessionsService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey) {
      throw new Error('Stripe secret key is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
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
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
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
    await this.createSessionAndBookingFromMetadata(metadata);
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    // For now, we only log failures; fulfillment is driven by success events.
    console.warn(
      `Payment failed for intent ${paymentIntent.id}: ${paymentIntent.last_payment_error?.message}`,
    );
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

      // Create session using intent metadata
      const session = this.sessionRepository.create({
        type: metadata.service_type as any, // validated by schema upstream
        teacherId: parseInt(String(metadata.teacher_id), 10),
        startAt: new Date(String(metadata.start_at)),
        endAt: new Date(String(metadata.end_at)),
        capacityMax: 1, // Private sessions have capacity of 1
        status: SessionStatus.SCHEDULED,
        visibility: SessionVisibility.PRIVATE,
        requiresEnrollment: false,
        sourceTimezone: 'UTC', // Store in UTC
      });

      const savedSession = await this.sessionRepository.save(session);

      // Create booking
      const booking = this.bookingRepository.create({
        sessionId: savedSession.id,
        studentId,
        status: BookingStatus.CONFIRMED,
        acceptedAt: new Date(),
      });

      await this.bookingRepository.save(booking);

      console.log(
        `Created session ${savedSession.id} and booking for student ${studentId}`,
      );
    } catch (error) {
      console.error('Error creating session and booking from intent:', error);
      // Don't throw - we don't want webhook processing to fail
    }
  }
}
