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
  ServiceType,
  ServiceKey,
  serviceTypeToServiceKey,
} from '../common/types/class-types.js';

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
    private configService: ConfigService,
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
      const customer = await this.stripe.customers.create({
        metadata: {
          user_id: userId.toString(),
          student_id: student.id.toString(),
        },
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
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: totalMinor,
      currency,
      customer: stripeCustomerId,
      metadata: {
        order_id: savedOrder.id.toString(),
        student_id: student.id.toString(),
        user_id: userId.toString(),
        price_key: sessionPriceKey,
        start: createPaymentIntentDto.start,
        end: createPaymentIntentDto.end,
        teacher: createPaymentIntentDto.teacher.toString(),
        service_type: createPaymentIntentDto.serviceType,
        product_id: productMapping.stripeProductId,
      },
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

    order.status = OrderStatus.PAID;
    await this.orderRepository.save(order);
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
}
