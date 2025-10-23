import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Stripe from "stripe";
import { ServiceType } from "../../common/types/class-types.js";
import { Session } from "../../sessions/entities/session.entity.js";
import { Booking, BookingStatus } from "../entities/booking.entity.js";
import { Student } from "../../students/entities/student.entity.js";
import { StripeMetadataUtils } from "../dto/stripe-metadata.dto.js";
import type { CreateSessionResponse } from "@thrive/shared";

/**
 * Service to handle booking a seat in an existing group class
 */
@Injectable()
export class GroupClassBookingService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>("stripe.secretKey");
    if (!secretKey) {
      throw new Error("Stripe secret key is not configured");
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }

  /**
   * Create a Stripe payment session for booking a seat in an existing group class
   */
  async createGroupClassBookingSession(
    priceId: string,
    sessionId: number,
    userId: number,
  ): Promise<CreateSessionResponse> {
    // Get the student record
    const student = await this.studentRepository.findOne({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student record not found for user ${userId}`,
      );
    }

    // Find the session
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, type: ServiceType.GROUP },
      relations: ["teacher"],
    });

    if (!session) {
      throw new NotFoundException(
        `Group class session with ID ${sessionId} not found`,
      );
    }

    // Check if the session has available capacity
    const existingBookings = await this.bookingRepository.count({
      where: {
        sessionId,
        status: BookingStatus.CONFIRMED,
      },
    });

    if (existingBookings >= session.capacityMax) {
      throw new BadRequestException(
        "This class is already at maximum capacity",
      );
    }

    // Check if the student has already booked this session
    const existingBooking = await this.bookingRepository.findOne({
      where: {
        sessionId,
        studentId: student.id,
        status: BookingStatus.CONFIRMED,
      },
    });

    if (existingBooking) {
      throw new BadRequestException(
        "You have already booked a seat in this class",
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = student.stripeCustomerId;
    if (!stripeCustomerId) {
      const customerMetadata = StripeMetadataUtils.createCustomerMetadata({
        userId,
        studentId: student.id,
      });

      const customer = await this.stripe.customers.create({
        metadata: StripeMetadataUtils.toStripeFormat(customerMetadata),
      });
      stripeCustomerId = customer.id;

      // Update student with Stripe customer ID
      student.stripeCustomerId = stripeCustomerId;
      await this.studentRepository.save(student);
    }

    // Get the price details from Stripe
    const stripePrice = await this.stripe.prices.retrieve(priceId);
    if (!stripePrice.active) {
      throw new BadRequestException("Selected package is no longer available");
    }

    // Create pending booking for the session
    const pendingBooking = this.bookingRepository.create({
      sessionId,
      studentId: student.id,
      status: BookingStatus.PENDING,
      invitedAt: new Date(),
    });
    const savedBooking = await this.bookingRepository.save(pendingBooking);

    // Create PaymentIntent referencing the existing session
    const paymentIntentMetadata =
      StripeMetadataUtils.createPaymentIntentMetadata({
        studentId: student.id,
        userId,
        serviceType: ServiceType.GROUP,
        teacherId: session.teacherId,
        startAt: session.startAt.toISOString(),
        endAt: session.endAt.toISOString(),
        productId: stripePrice.product as string,
        priceId,
        notes: `Group class booking - Session #${sessionId}`,
        source: "group-class-booking",
      });

    paymentIntentMetadata.session_id = sessionId.toString();
    paymentIntentMetadata.booking_id = savedBooking.id.toString();

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: stripePrice.unit_amount || 0,
      currency: stripePrice.currency,
      customer: stripeCustomerId,
      metadata: StripeMetadataUtils.toStripeFormat(paymentIntentMetadata),
      automatic_payment_methods: { enabled: true },
    });

    if (!paymentIntent.client_secret) {
      throw new BadRequestException("Failed to create payment session");
    }

    return { clientSecret: paymentIntent.client_secret };
  }
}
