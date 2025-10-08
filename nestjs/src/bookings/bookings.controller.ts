import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { BookingsService } from './bookings.service.js';
import { CancelBookingSchema } from './bookings.service.js';
import type { CancelBookingDto } from './bookings.service.js';
import type { Request as ExpressRequest } from 'express';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Get all bookings for the authenticated student
   */
  @Get('student/:studentId')
  async getStudentBookings(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Request() req: ExpressRequest,
  ) {
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers['x-auth-user-id'] as string;

    if (!userId || parseInt(userId, 10) !== studentId) {
      throw new UnauthorizedException('Access denied');
    }

    return this.bookingsService.getStudentBookings(studentId);
  }

  /**
   * Check if a student can modify a booking
   */
  @Get(':id/can-modify')
  async canModifyBooking(
    @Param('id', ParseIntPipe) bookingId: number,
    @Request() req: ExpressRequest,
  ) {
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers['x-auth-user-id'] as string;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.bookingsService.canModifyBooking(
      bookingId,
      parseInt(userId, 10),
    );
  }

  /**
   * Cancel a booking
   */
  @Post(':id/cancel')
  async cancelBooking(
    @Param('id', ParseIntPipe) bookingId: number,
    @Body(new ZodValidationPipe(CancelBookingSchema)) dto: CancelBookingDto,
    @Request() req: ExpressRequest,
  ) {
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers['x-auth-user-id'] as string;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.bookingsService.cancelBooking(
      bookingId,
      parseInt(userId, 10),
      dto,
    );
  }
}
