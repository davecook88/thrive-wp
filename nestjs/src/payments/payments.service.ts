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
import { Order, OrderStatus } from './entities/order.entity.js';
import { OrderItem, ItemType } from './entities/order-item.entity.js';
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
  orderId: number;
  amountMinor: number;
  currency: string;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
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

    // Create order
    const order = this.orderRepository.create({
      studentId: student.id,
      status: OrderStatus.REQUIRES_PAYMENT,
      currency,
      subtotalMinor,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor,
      stripeCustomerId,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create order item
    const sessionPriceKey = `SESSION:${createPaymentIntentDto.serviceType}:${createPaymentIntentDto.start}:${createPaymentIntentDto.teacher}`;
    const orderItem = this.orderItemRepository.create({
      orderId: savedOrder.id,
      itemType: ItemType.SESSION,
      itemRef: sessionPriceKey,
      title: `${createPaymentIntentDto.serviceType} Class with ${createPaymentIntentDto.teacher}`,
      quantity,
      amountMinor: unitAmount,
      currency,
      stripePriceId: stripePrice.id,
      metadata: {
        start: createPaymentIntentDto.start,
        end: createPaymentIntentDto.end,
        teacher: createPaymentIntentDto.teacher,
        serviceType: createPaymentIntentDto.serviceType,
        notes: createPaymentIntentDto.notes,
        productId: productMapping.stripeProductId,
      },
    });

    await this.orderItemRepository.save(orderItem);

    // Create Stripe PaymentIntent
    const paymentIntentMetadata =
      StripeMetadataUtils.createPaymentIntentMetadata({
        orderId: savedOrder.id,
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

    // Update order with PaymentIntent ID
    savedOrder.stripePaymentIntentId = paymentIntent.id;
    await this.orderRepository.save(savedOrder);

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
      orderId: savedOrder.id,
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
    const metadata: ParsedStripeMetadata = StripeMetadataUtils.fromStripeFormat(
      paymentIntent.metadata || {},
    );
    const orderId = metadata.order_id;

    if (!orderId || typeof orderId !== 'string') {
      console.warn('PaymentIntent missing valid order_id metadata');
      return;
    }

    const order = await this.orderRepository.findOne({
      where: { id: parseInt(orderId, 10) },
      relations: ['student'],
    });

    if (!order) {
      console.warn(`Order ${orderId} not found`);
      return;
    }

    // Update order status
    order.status = OrderStatus.PAID;
    await this.orderRepository.save(order);

    // Get order items to create sessions and bookings
    const orderItems = await this.orderItemRepository.find({
      where: { orderId: order.id },
    });

    for (const item of orderItems) {
      if (item.itemType === ItemType.SESSION) {
        await this.createSessionAndBookingFromOrderItem(order, item, metadata);
      }
    }
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) {
      console.warn('PaymentIntent missing order_id metadata');
      return;
    }

    const order = await this.orderRepository.findOne({
      where: { id: parseInt(orderId, 10) },
    });
    if (!order) {
      console.warn(`Order ${orderId} not found`);
      return;
    }

    order.status = OrderStatus.FAILED;
    await this.orderRepository.save(order);
  }

  private async createSessionAndBookingFromOrderItem(
    order: Order,
    orderItem: OrderItem,
    metadata: ParsedStripeMetadata,
  ): Promise<void> {
    try {
      // Parse the metadata from the order item
      const itemMetadata = orderItem.metadata || {};

      // Create session
      const session = this.sessionRepository.create({
        type: itemMetadata.serviceType || metadata.service_type,
        teacherId: parseInt(itemMetadata.teacher || metadata.teacher_id, 10),
        startAt: new Date(itemMetadata.start || metadata.start_at),
        endAt: new Date(itemMetadata.end || metadata.end_at),
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
        studentId: order.studentId,
        status: BookingStatus.CONFIRMED,
        acceptedAt: new Date(),
      });

      await this.bookingRepository.save(booking);

      console.log(
        `Created session ${savedSession.id} and booking for student ${order.studentId}`,
      );
    } catch (error) {
      console.error(
        'Error creating session and booking from order item:',
        error,
      );
      // Don't throw - we don't want webhook processing to fail
    }
  }
}
