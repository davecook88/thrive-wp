import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import {
  PaymentsService,
  CreatePaymentIntentResponse,
} from './payments.service.js';
import {
  CreatePaymentIntentSchema,
  CreateSessionSchema,
} from './dto/create-payment-intent.dto.js';
import type { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import type { Request as ExpressRequest } from 'express';

const BookWithPackageSchema = z.object({
  packageId: z.number().positive('Package ID must be positive'),
  sessionId: z.number().positive('Session ID must be positive'),
  confirmed: z.boolean().optional(),
});

type BookWithPackageDto = z.infer<typeof BookWithPackageSchema>;

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('stripe-key')
  getStripeKey(): { publishableKey: string } {
    return this.paymentsService.getStripePublishableKey();
  }

  @Post('create-session')
  async createSession(
    @Body(new ZodValidationPipe(CreateSessionSchema))
    body: z.infer<typeof CreateSessionSchema>,
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

  @Post('book-with-package')
  async bookWithPackage(
    @Body(new ZodValidationPipe(BookWithPackageSchema))
    body: BookWithPackageDto,
    @Request() req: ExpressRequest,
  ) {
    const userId = req.headers['x-auth-user-id'] as string;
    if (!userId) throw new UnauthorizedException('Authentication required');
    return this.paymentsService.bookWithPackage(
      parseInt(userId, 10),
      body.packageId,
      body.sessionId,
      body.confirmed,
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
