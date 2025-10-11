import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waitlist } from './entities/waitlist.entity.js';
import { WaitlistsService } from './waitlists.service.js';
import { WaitlistsController } from './waitlists.controller.js';
import { Session } from '../sessions/entities/session.entity.js';
import { Booking } from '../payments/entities/booking.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Waitlist, Session, Booking]), AuthModule],
  providers: [WaitlistsService],
  controllers: [WaitlistsController],
  exports: [WaitlistsService],
})
export class WaitlistsModule {}
