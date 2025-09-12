import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  PaymentsService,
  CreatePaymentIntentResponse,
} from './payments.service.js';
import { CreatePaymentIntentSchema } from './dto/create-payment-intent.dto.js';
import type { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import type { Request as ExpressRequest } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('stripe-key')
  async getStripeKey(): Promise<{ publishableKey: string }> {
    return this.paymentsService.getStripePublishableKey();
  }

  @Post('create-session')
  async createSession(
    @Body() body: { priceId: string; bookingData: any },
    @Request() req: ExpressRequest,
  ): Promise<{ clientSecret: string }> {
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers['x-auth-user-id'] as string;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.paymentsService.createPaymentSession(
      body.priceId,
      body.bookingData,
      parseInt(userId, 10),
    );
  }

  @Post('payment-intent')
  createPaymentIntent(
    @Body(new ZodValidationPipe(CreatePaymentIntentSchema))
    createPaymentIntentDto: CreatePaymentIntentDto,
    @Request() req: ExpressRequest,
  ): Promise<CreatePaymentIntentResponse> {
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers['x-auth-user-id'] as string;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.paymentsService.createPaymentIntent(
      createPaymentIntentDto,
      parseInt(userId, 10),
    );
  }
}
