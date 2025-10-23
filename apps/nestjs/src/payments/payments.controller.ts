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
import { GroupClassBookingService } from "./services/group-class-booking.service.js";
import {
  BookingResponseSchema,
  BookWithPackagePayloadSchema,
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
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly groupClassBookingService: GroupClassBookingService,
  ) {}

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

    // Handle based on booking type
    if (
      "sessionId" in body.bookingData &&
      "serviceType" in body.bookingData &&
      body.bookingData.serviceType === "GROUP"
    ) {
      // This is a group class booking
      return this.groupClassBookingService.createGroupClassBookingSession(
        body.priceId,
        body.bookingData.sessionId as number,
        parseInt(userId, 10),
      );
    } else {
      // This is a private session booking (legacy flow)
      return this.paymentsService.createPaymentSession(
        body.priceId,
        body.bookingData,
        parseInt(userId, 10),
      );
    }
  }

  @Post("book-with-package")
  async bookWithPackage(
    @Body(new ZodValidationPipe(BookWithPackagePayloadSchema))
    body: BookWithPackagePayloadDto,
    @Request() req: ExpressRequest,
  ) {
    console.log("bookWithPackage called with body:", body);
    const userId = req.headers["x-auth-user-id"] as string;
    console.log("Extracted userId from headers:", userId);
    if (!userId) throw new UnauthorizedException("Authentication required");
    const res = await this.paymentsService.bookWithPackage(
      parseInt(userId, 10),
      body.packageId,
      body.sessionId,
      body.confirmed,
    );

    console.log("Booking result:", res);
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
