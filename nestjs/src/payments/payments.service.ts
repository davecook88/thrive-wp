import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import { Student } from '../students/entities/student.entity.js';
import { Order, OrderStatus } from './entities/order.entity.js';
import { OrderItem, ItemType } from './entities/order-item.entity.js';
import { StripeProductMap } from './entities/stripe-product-map.entity.js';

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
    // For one-to-one class bookings, use the predefined service key
    const serviceKey = 'ONE_TO_ONE_CLASS';
    const quantity = 1; // One-to-one classes are always quantity 1
    
    // Look up the product mapping in the database
    const productMapping = await this.stripeProductMapRepository.findOne({
      where: { 
        serviceKey,
        active: true 
      },
    });

    if (!productMapping) {
      throw new BadRequestException(`No active product mapping found for ${serviceKey}. Please contact support.`);
    }

    // Get the student record
    const student = await this.studentRepository.findOne({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException(`Student record not found for user ${userId}`);
    }

    // Get the default active price for this product from Stripe
    const prices = await this.stripe.prices.list({
      product: productMapping.stripeProductId,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      throw new BadRequestException('No active price found for one-to-one classes. Please contact support.');
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
    const sessionPriceKey = `SESSION:ONE_TO_ONE:${createPaymentIntentDto.start}:${createPaymentIntentDto.teacher}`;
    const orderItem = this.orderItemRepository.create({
      orderId: savedOrder.id,
      itemType: ItemType.SESSION,
      itemRef: sessionPriceKey,
      title: `One-to-One Class with ${createPaymentIntentDto.teacher}`,
      quantity,
      amountMinor: unitAmount,
      currency,
      stripePriceId: stripePrice.id,
      metadata: {
        start: createPaymentIntentDto.start,
        end: createPaymentIntentDto.end,
        teacher: createPaymentIntentDto.teacher,
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
        teacher: createPaymentIntentDto.teacher,
        product_id: productMapping.stripeProductId,
      },
    });

    // Update order with PaymentIntent ID
    savedOrder.stripePaymentIntentId = paymentIntent.id;
    await this.orderRepository.save(savedOrder);

    const publishableKey = this.configService.get<string>('stripe.publishableKey') || 'pk_test_placeholder';
    
    if (!publishableKey || publishableKey === 'pk_test_placeholder') {
      console.warn('STRIPE_PUBLISHABLE_KEY environment variable not set. Please configure it for production.');
    }
    
    return {
      clientSecret: paymentIntent.client_secret as string,
      publishableKey,
      orderId: savedOrder.id,
      amountMinor: totalMinor,
      currency,
    };
  }

  async createProductMapping(serviceKey: string, stripeProductId: string): Promise<StripeProductMap> {
    // Check if mapping already exists
    const existing = await this.stripeProductMapRepository.findOne({
      where: { serviceKey }
    });
    
    if (existing) {
      throw new BadRequestException(`Product mapping for ${serviceKey} already exists`);
    }
    
    // Verify the product exists in Stripe
    try {
      await this.stripe.products.retrieve(stripeProductId);
    } catch (error) {
      throw new BadRequestException(`Stripe product ${stripeProductId} not found`);
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
}
