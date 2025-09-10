import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller.js';
import { WebhooksController } from './webhooks.controller.js';
import { PaymentsService } from './payments.service.js';
import { StripeProductMap } from './entities/stripe-product-map.entity.js';
import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Session } from '../sessions/entities/session.entity.js';
import { Booking } from './entities/booking.entity.js';
import { SessionsModule } from '../sessions/sessions.module.js';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      StripeProductMap,
      Order,
      OrderItem,
      Student,
      Session,
      Booking,
    ]),
    SessionsModule,
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
