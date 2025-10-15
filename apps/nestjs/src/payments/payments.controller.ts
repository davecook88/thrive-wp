import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UnauthorizedException,
} from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import { z } from "zod";
import {
  PaymentsService,
  CreatePaymentIntentResponse,
} from "./payments.service.js";
import {
  BookingResponseSchema,
  BookWithPackagePayloadSchema,
  BookWithPackageSchema,
  CreatePaymentIntentSchema,
  CreateSessionSchema,
} from "@thrive/shared";
import type {
  BookWithPackagePayloadDto,
  CreatePaymentIntentDto,
} from "@thrive/shared";
import type { Request as ExpressRequest } from "express";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("stripe-key")
  getStripeKey(): { publishableKey: string } {
    return this.paymentsService.getStripePublishableKey();
  }

  @Post("create-session")
  async createSession(
    @Body(new ZodValidationPipe(CreateSessionSchema))
    body: z.infer<typeof CreateSessionSchema>,
    @Request() req: ExpressRequest,
  ): Promise<{ clientSecret: string }> {
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers["x-auth-user-id"] as string;

    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }

    return this.paymentsService.createPaymentSession(
      body.priceId,
      body.bookingData,
      parseInt(userId, 10),
    );
  }

  @Post("book-with-package")
  async bookWithPackage(
    @Body(new ZodValidationPipe(BookWithPackagePayloadSchema))
    body: BookWithPackagePayloadDto,
    @Request() req: ExpressRequest,
  ) {
    const userId = req.headers["x-auth-user-id"] as string;
    if (!userId) throw new UnauthorizedException("Authentication required");
    const res = await this.paymentsService.bookWithPackage(
      parseInt(userId, 10),
      body.packageId,
      body.sessionId,
      body.confirmed,
    );
    return BookingResponseSchema.parse(res);
  }

  @Post("payment-intent")
  createPaymentIntent(
    @Body(new ZodValidationPipe(CreatePaymentIntentSchema))
    createPaymentIntentDto: CreatePaymentIntentDto,
    @Request() req: ExpressRequest,
  ): Promise<CreatePaymentIntentResponse> {
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers["x-auth-user-id"] as string;

    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }

    return this.paymentsService.createPaymentIntent(
      createPaymentIntentDto,
      parseInt(userId, 10),
    );
  }
}
