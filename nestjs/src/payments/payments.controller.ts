import { Controller, Post, Body, Request, UnauthorizedException } from '@nestjs/common';
import { PaymentsService, CreatePaymentIntentResponse } from './payments.service.js';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import type { Request as ExpressRequest } from 'express';

@Controller('payment')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payment-intent')
  createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @Request() req: ExpressRequest,
  ): Promise<CreatePaymentIntentResponse> {
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers['x-auth-user-id'] as string;
    
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.paymentsService.createPaymentIntent(createPaymentIntentDto, parseInt(userId, 10));
  }
}
