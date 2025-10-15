import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UnauthorizedException,
  ParseIntPipe,
} from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import { BookingsService } from "./bookings.service.js";
import type { Request as ExpressRequest } from "express";
import {
  AvailableSessionsResponseSchema,
  CreateBookingRequestSchema,
  type CreateBookingRequest,
  CancelBookingSchema,
  type CancelBookingDto,
} from "@thrive/shared";

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async createBooking(
    @Body(new ZodValidationPipe(CreateBookingRequestSchema))
    body: CreateBookingRequest,
    @Request() req: ExpressRequest,
  ) {
    const userId = req.headers["x-auth-user-id"] as string;
    if (!userId) throw new UnauthorizedException("Authentication required");

    // The BookingsService.createBooking expects a studentId (student.id).
    // Resolve the student id from the user id here using the Student repository.
    // Reuse the pattern used elsewhere in the app (controllers lookup Student by userId).
    const parsedUserId = parseInt(userId, 10);

    const booking = await this.bookingsService.createBooking(
      parsedUserId,
      body.sessionId,
      body.studentPackageId,
      body.confirmed,
    );

    return {
      bookingId: booking.id,
      status: booking.status,
    };
  }

  @Get("student/:studentId")
  async getStudentBookings(
    @Param("studentId", ParseIntPipe) studentId: number,
    @Request() req: ExpressRequest,
  ) {
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers["x-auth-user-id"] as string;

    if (!userId || parseInt(userId, 10) !== studentId) {
      throw new UnauthorizedException("Access denied");
    }

    return this.bookingsService.getStudentBookings(studentId);
  }

  /**
   * Check if a student can modify a booking
   */
  @Get(":id/can-modify")
  async canModifyBooking(
    @Param("id", ParseIntPipe) bookingId: number,
    @Request() req: ExpressRequest,
  ) {
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers["x-auth-user-id"] as string;

    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }

    return this.bookingsService.canModifyBooking(
      bookingId,
      parseInt(userId, 10),
    );
  }

  /**
   * Cancel a booking
   */
  @Post(":id/cancel")
  async cancelBooking(
    @Param("id", ParseIntPipe) bookingId: number,
    @Body(new ZodValidationPipe(CancelBookingSchema)) dto: CancelBookingDto,
    @Request() req: ExpressRequest,
  ) {
    console.debug(`[DEBUG] cancelBooking called for bookingId=${bookingId}`);
    // Extract user ID from X-Auth headers injected by Nginx
    const userId = req.headers["x-auth-user-id"] as string;

    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      return await this.bookingsService.cancelBooking(
        bookingId,
        parseInt(userId, 10),
        dto,
      );
    } catch (err: unknown) {
      console.error(
        "[DEBUG] cancelBooking error:",
        err instanceof Error ? err.message : err,
        err instanceof Error ? err.stack : "no-stack",
      );
      throw err;
    }
  }
}
