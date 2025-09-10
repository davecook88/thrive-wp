import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Body() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    try {
      // Verify and construct the event
      const event = await this.paymentsService.constructStripeEvent(
        rawBody,
        signature,
      );

      // Handle the event
      await this.paymentsService.handleStripeEvent(event);

      this.logger.log(`Handled Stripe event: ${event.type}`);
      return { received: true };
    } catch (error) {
      this.logger.error('Error handling Stripe webhook', error);
      throw new BadRequestException('Webhook error');
    }
  }
}
