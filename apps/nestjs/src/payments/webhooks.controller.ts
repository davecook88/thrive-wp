import {
  Controller,
  Post,
  RawBody,
  Headers,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PaymentsService } from "./payments.service.js";

@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("stripe")
  async handleStripeWebhook(
    @RawBody() rawBody: Buffer,
    @Headers("stripe-signature") signature: string,
  ): Promise<{ received: boolean }> {
    this.logger.log(
      `Received webhook - rawBody length: ${rawBody?.length}, signature: ${signature?.substring(0, 20)}...`,
    );

    if (!signature) {
      throw new BadRequestException("Missing Stripe signature");
    }

    if (!rawBody || rawBody.length === 0) {
      this.logger.error("No webhook payload provided");
      throw new BadRequestException("No webhook payload provided");
    }

    try {
      // Verify and construct the event
      const event = this.paymentsService.constructStripeEvent(
        rawBody,
        signature,
      );

      // Handle the event
      await this.paymentsService.handleStripeEvent(event);

      this.logger.log(`Handled Stripe event: ${event.type}`);
      return { received: true };
    } catch (error) {
      this.logger.error("Error handling Stripe webhook", error);
      throw new BadRequestException("Webhook error");
    }
  }
}
