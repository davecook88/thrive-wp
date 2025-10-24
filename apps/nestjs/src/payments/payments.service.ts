import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Stripe from "stripe";
import type { CreatePaymentIntentDto } from "@thrive/shared";
import { Student } from "../students/entities/student.entity.js";
import {
  ScopeType,
  StripeProductMap,
} from "./entities/stripe-product-map.entity.js";
import {
  Session,
  SessionStatus,
  SessionVisibility,
} from "../sessions/entities/session.entity.js";
import { Booking, BookingStatus } from "./entities/booking.entity.js";
import {
  ServiceType,
  serviceTypeToServiceKey,
} from "../common/types/class-types.js";
import {
  StripeMetadataUtils,
  ParsedStripeMetadata,
} from "./dto/stripe-metadata.dto.js";
import { SessionsService } from "../sessions/services/sessions.service.js";
import { PackagesService } from "../packages/packages.service.js";
import { CourseStepProgressService } from "../course-programs/services/course-step-progress.service.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";
import { PackageUse } from "../packages/entities/package-use.entity.js";
import {
  canUsePackageForSession,
  isCrossTierBooking,
  calculateCreditsRequired,
  getCrossTierWarningMessage,
} from "../common/types/credit-tiers.js";
import {
  PrivateSessionBookingData,
  GroupSessionBookingData,
} from "@thrive/shared";

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  publishableKey: string;
  amountMinor: number;
  currency: string;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StripeProductMap)
    private stripeProductMapRepository: Repository<StripeProductMap>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(StudentPackage)
    private studentPackageRepository: Repository<StudentPackage>,
    @InjectRepository(PackageUse)
    private packageUseRepository: Repository<PackageUse>,
    private configService: ConfigService,
    private sessionsService: SessionsService,
    private packagesService: PackagesService,
    private courseStepProgressService: CourseStepProgressService,
  ) {
    const secretKey = this.configService.get<string>("stripe.secretKey");
    if (!secretKey) {
      throw new Error("Stripe secret key is not configured");
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }

  private get stripePublishableKey(): string {
    const publishableKey = this.configService.get<string>(
      "stripe.publishableKey",
    );
    if (!publishableKey) {
      throw new Error("Stripe publishable key is not configured");
    }
    return publishableKey;
  }

  private getOrCreateStripeCustomerId = async (
    userId: number,
    studentId: number,
  ): Promise<string> => {
    const student = await this.studentRepository.findOne({
      where: { id: studentId, userId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student record not found for user ${userId}`,
      );
    }

    if (student.stripeCustomerId) {
      return student.stripeCustomerId;
    }

    const customerMetadata = StripeMetadataUtils.createCustomerMetadata({
      userId,
      studentId: student.id,
    });

    const customer = await this.stripe.customers.create({
      metadata: StripeMetadataUtils.toStripeFormat(customerMetadata),
    });

    // Update student with Stripe customer ID
    student.stripeCustomerId = customer.id;
    await this.studentRepository.save(student);

    return customer.id;
  };

  /**
   * Create a booking using an existing student package credit (no Stripe/payment)
   * Returns the created booking record.
   */
  async bookWithPackage(
    studentUserId: number,
    packageId: number,
    sessionId: number,
    confirmed?: boolean,
    allowanceId?: number,
  ) {
    // Resolve student.id from userId
    const student = await this.studentRepository.findOne({
      where: { userId: studentUserId },
    });
    if (!student) throw new NotFoundException("Student not found");

    // Fetch session with teacher relation for tier validation
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ["teacher"],
    });
    if (!session) throw new NotFoundException("Session not found");

    // Fetch package for tier validation
    const pkg = await this.studentPackageRepository.findOne({
      where: { id: packageId, studentId: student.id },
      relations: ["stripeProductMap", "stripeProductMap.allowances"],
    });
    if (!pkg) throw new NotFoundException("Package not found");

    // Tier validation: Check if package contains a compatible allowance
    const { canUse, allowance } = canUsePackageForSession({
      pkg,
      session,
      allowanceId,
    });

    if (!canUse || !allowance) {
      throw new BadRequestException(
        "This package cannot be used for this session type",
      );
    }

    // Cross-tier validation: Require confirmation for higher-tier credits
    const { isCrossTier } = isCrossTierBooking(pkg, session, allowance.id);
    if (isCrossTier) {
      if (!confirmed) {
        const warningMessage = getCrossTierWarningMessage(
          pkg,
          session,
          allowance.id,
        );
        throw new BadRequestException(
          `Cross-tier booking requires confirmation. ${warningMessage}`,
        );
      }
    }

    // Calculate credits required based on session duration using the allowance's credit unit
    const sessionDurationMinutes = Math.round(
      (session.endAt.getTime() - session.startAt.getTime()) / 60000,
    );
    const creditsCost = calculateCreditsRequired(
      sessionDurationMinutes,
      allowance.creditUnitMinutes,
    );

    // Use package (create package_use) with calculated credits
    const { package: updatedPkg, use } =
      await this.packagesService.usePackageForSession(
        student.id,
        packageId,
        sessionId,
        {
          usedBy: student.id,
          creditsUsed: creditsCost,
          serviceType: session.type,
          allowanceId: allowance.id,
        },
      );

    // Create booking referencing package
    const booking = this.bookingRepository.create({
      sessionId,
      studentId: student.id,
      status: BookingStatus.CONFIRMED,
      acceptedAt: new Date(),
      studentPackageId: updatedPkg.id,
      creditsCost,
    });

    const saved = await this.bookingRepository.save(booking);

    // Link package_use.booking_id to created booking (best effort)
    try {
      await this.packagesService.linkUseToBooking(use.id, saved.id);
    } catch (e) {
      // log but don't fail booking
      this.logger.warn("Failed to link package use to booking", e as Error);
    }

    return saved;
  }

  async createPaymentIntent(
    createPaymentIntentDto: CreatePaymentIntentDto,
    userId: number,
  ): Promise<CreatePaymentIntentResponse> {
    // Use the service key based on the service type
    const serviceKey = serviceTypeToServiceKey(
      createPaymentIntentDto.serviceType,
    );
    const quantity = 1; // All individual bookings are quantity 1

    // Look up the product mapping in the database
    const productMapping = await this.stripeProductMapRepository.findOne({
      where: {
        serviceKey,
        active: true,
      },
    });

    if (!productMapping) {
      throw new BadRequestException(
        `No active product mapping found for ${serviceKey}. Please contact support.`,
      );
    }

    // Get the student record
    const student = await this.studentRepository.findOne({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student record not found for user ${userId}`,
      );
    }

    // Validate teacher availability for private sessions
    if (createPaymentIntentDto.serviceType === ServiceType.PRIVATE) {
      await this.sessionsService.validatePrivateSession({
        teacherId: createPaymentIntentDto.teacher,
        startAt: createPaymentIntentDto.start,
        endAt: createPaymentIntentDto.end,
        studentId: student.id,
      });
    }

    // Get the default active price for this product from Stripe
    const prices = await this.stripe.prices.list({
      product: productMapping.stripeProductId,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      throw new BadRequestException(
        "No active price found for one-to-one classes. Please contact support.",
      );
    }

    const stripePrice = prices.data[0];
    const unitAmount = stripePrice.unit_amount || 0;
    const currency = stripePrice.currency;

    // Calculate totals
    const subtotalMinor = unitAmount * quantity;
    const totalMinor = subtotalMinor; // Phase 1: no discounts or tax

    // Create or get Stripe customer
    const stripeCustomerId =
      student.stripeCustomerId ??
      (await this.getOrCreateStripeCustomerId(userId, student.id));

    // Create Stripe PaymentIntent
    const paymentIntentMetadata =
      StripeMetadataUtils.createPaymentIntentMetadata({
        studentId: student.id,
        userId,
        serviceType: createPaymentIntentDto.serviceType,
        teacherId: createPaymentIntentDto.teacher,
        startAt: createPaymentIntentDto.start,
        endAt: createPaymentIntentDto.end,
        productId: productMapping.stripeProductId,
        priceId: stripePrice.id,
        notes: createPaymentIntentDto.notes,
      });

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: totalMinor,
      currency,
      customer: stripeCustomerId,
      metadata: StripeMetadataUtils.toStripeFormat(paymentIntentMetadata),
    });

    return {
      clientSecret: paymentIntent.client_secret as string,
      publishableKey: this.stripePublishableKey,
      amountMinor: totalMinor,
      currency,
    };
  }

  async createProductMapping(
    serviceKey: string,
    stripeProductId: string,
  ): Promise<StripeProductMap> {
    // Check if mapping already exists
    const existing = await this.stripeProductMapRepository.findOne({
      where: { serviceKey },
    });

    if (existing) {
      throw new BadRequestException(
        `Product mapping for ${serviceKey} already exists`,
      );
    }

    // Verify the product exists in Stripe
    try {
      await this.stripe.products.retrieve(stripeProductId);
    } catch {
      throw new BadRequestException(
        `Stripe product ${stripeProductId} not found`,
      );
    }

    // Create the mapping record
    const mapping = this.stripeProductMapRepository.create({
      serviceKey,
      stripeProductId,
      active: true,
      scopeType: ScopeType.SESSION,
      metadata: {
        description: `Product mapping for ${serviceKey}`,
      },
    });

    return this.stripeProductMapRepository.save(mapping);
  }

  constructStripeEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      "stripe.webhookSecret",
    );
    if (!webhookSecret) {
      throw new Error("Stripe webhook secret is not configured");
    }
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }

  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "payment_intent.succeeded":
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentIntentFailed(event.data.object);
        break;
      // Add more event types as needed
      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.debug("Handling payment_intent.succeeded event");
    const metadata: ParsedStripeMetadata = StripeMetadataUtils.fromStripeFormat(
      paymentIntent.metadata || {},
    );

    // Check if this is a package purchase by looking for price_id and product_id
    const isPackagePurchase = metadata.price_id && metadata.product_id;

    if (isPackagePurchase) {
      // Handle package purchase workflow
      await this.handlePackagePurchase(paymentIntent, metadata);
    } else if (metadata.session_id && metadata.booking_id) {
      // If draft session/booking already created (session_id + booking_id present), promote them
      const sessionId = parseInt(String(metadata.session_id), 10);
      const bookingId = parseInt(String(metadata.booking_id), 10);
      try {
        await this.sessionRepository.manager.transaction(async (tx) => {
          const session = await tx.findOne(Session, {
            where: { id: sessionId },
          });
          if (session && session.status === SessionStatus.DRAFT) {
            session.status = SessionStatus.SCHEDULED;
            await tx.save(Session, session);
          }
          const booking = await tx.findOne(Booking, {
            where: { id: bookingId },
          });
          if (booking && booking.status === BookingStatus.PENDING) {
            booking.status = BookingStatus.CONFIRMED;
            booking.acceptedAt = new Date();
            await tx.save(Booking, booking);
          }
        });
        this.logger.log(
          `Promoted draft session ${sessionId} & booking ${bookingId} after successful payment`,
        );
      } catch (e) {
        this.logger.error("Error promoting draft session/booking:", e as Error);
      }
    } else {
      // Legacy path: create session + booking from metadata
      await this.createSessionAndBookingFromMetadata(metadata);
    }
  }

  private async handlePackagePurchase(
    paymentIntent: Stripe.PaymentIntent,
    metadata: ParsedStripeMetadata,
  ): Promise<void> {
    this.logger.debug(
      "Handling package purchase from payment_intent.succeeded",
    );

    // Get package details from Stripe price
    const priceId = String(metadata.price_id);
    const productId = String(metadata.product_id);
    const stripePrice = await this.stripe.prices.retrieve(priceId);
    const stripeProduct = await this.stripe.products.retrieve(productId);

    // Extract package metadata
    const packageMetadata = stripeProduct.metadata || {};
    const credits = parseInt(packageMetadata.credits || "0", 10);
    const expiresInDays = parseInt(packageMetadata.expires_in_days || "0", 10);
    const creditUnitMinutes = parseInt(
      packageMetadata.credit_unit_minutes || "0",
      10,
    );
    const teacherTier = parseInt(packageMetadata.teacher_tier || "0", 10);
    const serviceType = packageMetadata.service_type || "PRIVATE";

    if (credits <= 0) {
      this.logger.error(
        "Package has no credits defined:",
        JSON.stringify(packageMetadata),
      );
      return;
    }

    const userId = parseInt(String(metadata.user_id), 10);
    const sessionId = metadata.session_id
      ? parseInt(String(metadata.session_id), 10)
      : null;

    // Find the student record
    const student = await this.studentRepository.findOne({
      where: { userId },
    });

    if (!student) {
      this.logger.warn(`Student not found for user ${userId}`);
      return;
    }

    try {
      // Use a transaction to ensure atomicity and prevent race conditions
      await this.studentRepository.manager.transaction(async (tx) => {
        // Find the StripeProductMap for this purchase
        const productMapping = await tx.findOne(StripeProductMap, {
          where: {
            stripeProductId: productId,
            active: true,
          },
          relations: ["allowances"],
        });

        if (!productMapping) {
          this.logger.error(
            `No active StripeProductMap found for product ${productId}`,
          );
          return;
        }

        // Check if package already exists for this payment (idempotency protection)
        const existingPackage = await tx.findOne(StudentPackage, {
          where: { sourcePaymentId: paymentIntent.id },
        });

        let savedPackage: StudentPackage;
        if (existingPackage) {
          this.logger.log(
            `Package already exists for payment ${paymentIntent.id}, webhook duplicate/retry detected`,
          );
          savedPackage = existingPackage;
        } else {
          // 1. Create the student package record
          const expiresAt =
            expiresInDays > 0
              ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
              : null;

          const studentPackage = tx.create(StudentPackage, {
            studentId: student.id,
            stripeProductMapId: productMapping.id,
            packageName: stripeProduct.name,
            totalSessions: credits,
            purchasedAt: new Date(),
            expiresAt,
            sourcePaymentId: paymentIntent.id,
            stripeProductMap: productMapping,
            metadata: {
              stripeProductId: stripeProduct.id,
              stripePriceId: stripePrice.id,
              amountPaid: paymentIntent.amount_received,
              currency: paymentIntent.currency,
              credit_unit_minutes: creditUnitMinutes,
              teacher_tier:
                Number.isFinite(teacherTier) && teacherTier > 0
                  ? teacherTier
                  : undefined,
              service_type: serviceType,
            },
          });

          savedPackage = await tx.save(StudentPackage, studentPackage);
          this.logger.log(
            `Created student package ${savedPackage.id} with ${credits} credits`,
          );

          // Seed course progress for COURSE allowances
          if (
            productMapping.allowances &&
            productMapping.allowances.length > 0
          ) {
            const courseAllowances = productMapping.allowances.filter(
              (allowance) =>
                allowance.serviceType === ServiceType.COURSE &&
                allowance.courseProgramId,
            );

            for (const allowance of courseAllowances) {
              try {
                await this.courseStepProgressService.seedProgressForCourse(
                  savedPackage.id,
                  allowance.courseProgramId!,
                );
                this.logger.log(
                  `Seeded course progress for package ${savedPackage.id}, course ${allowance.courseProgramId}`,
                );
              } catch (error) {
                this.logger.error(
                  `Failed to seed course progress for package ${savedPackage.id}, course ${allowance.courseProgramId}:`,
                  error as Error,
                );
                // Don't throw - continue processing other courses
              }
            }
          }
        }

        // 2. If there's a session to book, use the package credit immediately
        if (sessionId) {
          // Lock the session to prevent race conditions
          const session = await tx.findOne(Session, {
            where: { id: sessionId },
            lock: { mode: "pessimistic_write" },
          });

          if (!session) {
            this.logger.warn(
              `Session ${sessionId} not found for package booking`,
            );
            return;
          }

          // Check if this is for an EXISTING booking (group/course sessions)
          const bookingId = metadata.booking_id
            ? parseInt(String(metadata.booking_id), 10)
            : null;

          if (bookingId) {
            // EXISTING BOOKING PATH: For group/course sessions with pre-created bookings
            const existingBooking = await tx.findOne(Booking, {
              where: {
                id: bookingId,
                sessionId,
                studentId: student.id,
              },
            });

            if (
              existingBooking &&
              existingBooking.status === BookingStatus.PENDING
            ) {
              // Promote PENDING → CONFIRMED for existing booking
              existingBooking.status = BookingStatus.CONFIRMED;
              existingBooking.acceptedAt = new Date();
              existingBooking.studentPackageId = savedPackage.id;
              existingBooking.creditsCost = 1;
              await tx.save(Booking, existingBooking);

              // Create package use record to deduct credits
              const packageUse = tx.create(PackageUse, {
                studentPackageId: savedPackage.id,
                bookingId: existingBooking.id,
                sessionId,
                usedAt: new Date(),
                usedBy: student.id,
                creditsUsed: 1,
              });
              await tx.save(PackageUse, packageUse);

              // Update session status if it's DRAFT
              if (session.status === SessionStatus.DRAFT) {
                session.status = SessionStatus.SCHEDULED;
                await tx.save(Session, session);
              }

              this.logger.log(
                `Promoted existing booking ${bookingId} to CONFIRMED using package and deducted 1 credit`,
              );
              return;
            }
          }

          // DRAFT SESSION PATH: For private sessions
          if (session.status !== SessionStatus.DRAFT) {
            this.logger.warn(
              `Session ${sessionId} is not in DRAFT status and no existing booking found`,
            );
            return;
          }

          // Create package use record (remaining balance is computed from these records)
          const packageUse = tx.create(PackageUse, {
            studentPackageId: savedPackage.id,
            sessionId,
            usedAt: new Date(),
            usedBy: student.id,
            creditsUsed: 1,
          });
          const savedPackageUse = await tx.save(PackageUse, packageUse);

          // Find existing booking (any status) to prevent duplicates
          const existingBooking = await tx.findOne(Booking, {
            where: {
              sessionId,
              studentId: student.id,
            },
          });

          let savedBooking: Booking;
          if (existingBooking) {
            if ([BookingStatus.PENDING].includes(existingBooking.status)) {
              // Update existing draft booking to confirmed status with package info
              existingBooking.status = BookingStatus.CONFIRMED;
              existingBooking.acceptedAt = new Date();
              existingBooking.studentPackageId = savedPackage.id;
              existingBooking.creditsCost = 1;
              savedBooking = await tx.save(Booking, existingBooking);
              this.logger.log(
                `Updated existing draft booking ${savedBooking.id} to confirmed status using package credit`,
              );
            } else {
              // Booking already exists and is confirmed - webhook duplicate/retry
              this.logger.log(
                `Booking already exists for session ${sessionId} and student ${student.id} with status ${existingBooking.status}, skipping creation`,
              );
              savedBooking = existingBooking;
            }
          } else {
            // Create new confirmed booking using credits
            const booking = tx.create(Booking, {
              sessionId,
              studentId: student.id,
              status: BookingStatus.CONFIRMED,
              acceptedAt: new Date(),
              studentPackageId: savedPackage.id,
              creditsCost: 1,
            });
            savedBooking = await tx.save(Booking, booking);
            this.logger.log(
              `Created new confirmed booking ${savedBooking.id} using package credit`,
            );
          }

          // Link the package use to the booking
          savedPackageUse.bookingId = savedBooking.id;
          await tx.save(PackageUse, savedPackageUse);

          // Update session status
          session.status = SessionStatus.SCHEDULED;
          await tx.save(Session, session);

          this.logger.log(
            `Created booking ${savedBooking.id} using package credit`,
          );
        }
      });
      this.logger.log(
        `Successfully processed package purchase for user ${userId}`,
      );
    } catch (error) {
      this.logger.error("Error processing package purchase:", error as Error);
      throw error;
    }
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    // For now, we only log failures; fulfillment is driven by success events.
    this.logger.warn(
      `Payment failed for intent ${paymentIntent.id}: ${paymentIntent.last_payment_error?.message}`,
    );
    const metadata: ParsedStripeMetadata = StripeMetadataUtils.fromStripeFormat(
      paymentIntent.metadata || {},
    );
    if (metadata.session_id && metadata.booking_id) {
      const sessionId = parseInt(String(metadata.session_id), 10);
      const bookingId = parseInt(String(metadata.booking_id), 10);
      try {
        await this.sessionRepository.manager.transaction(async (tx) => {
          const session = await tx.findOne(Session, {
            where: { id: sessionId },
          });
          if (session && session.status === SessionStatus.DRAFT) {
            session.status = SessionStatus.CANCELLED;
            await tx.save(Session, session);
          }
          const booking = await tx.findOne(Booking, {
            where: { id: bookingId },
          });
          if (booking && booking.status === BookingStatus.PENDING) {
            booking.status = BookingStatus.CANCELLED;
            booking.cancelledAt = new Date();
            booking.cancellationReason = "Payment failed";
            await tx.save(Booking, booking);
          }
        });
        this.logger.log(
          `Cancelled draft session ${sessionId} & booking ${bookingId} after failed payment`,
        );
      } catch (e) {
        this.logger.error(
          "Error cancelling draft session/booking:",
          e as Error,
        );
      }
    }
  }

  async createSessionAndBookingFromMetadata(
    metadata: ParsedStripeMetadata,
  ): Promise<void> {
    try {
      // Determine student from metadata
      const studentIdRaw = metadata.student_id;
      if (!studentIdRaw) {
        this.logger.warn("Stripe metadata missing student_id; cannot fulfill");
        return;
      }

      const studentId =
        typeof studentIdRaw === "string"
          ? parseInt(studentIdRaw, 10)
          : (studentIdRaw as number);

      const serviceType = metadata.service_type as ServiceType;

      let sessionId: number;

      // Handle session creation vs. existing session lookup
      if (metadata.session_id) {
        // For GROUP and COURSE sessions: session already exists, just create booking
        sessionId = parseInt(String(metadata.session_id), 10);

        // Verify the session exists and is appropriate for this service type
        const existingSession = await this.sessionRepository.findOne({
          where: { id: sessionId },
        });

        if (!existingSession) {
          this.logger.warn(
            `Session ${sessionId} not found or has been deleted`,
          );
          return;
        }

        if (existingSession.type !== serviceType) {
          this.logger.warn(
            `Session type mismatch: expected ${serviceType}, got ${existingSession.type}`,
          );
          return;
        }

        this.logger.log(
          `Using existing ${serviceType} session ${sessionId} for student ${studentId}`,
        );
      } else {
        // For PRIVATE sessions: create new session (existing behavior)
        if (serviceType !== ServiceType.PRIVATE) {
          this.logger.warn(
            `Cannot create ${serviceType} session without existing session_id`,
          );
          return;
        }

        // Validate availability before creating session
        try {
          await this.sessionsService.validatePrivateSession({
            teacherId: parseInt(String(metadata.teacher_id), 10),
            startAt: String(metadata.start_at),
            endAt: String(metadata.end_at),
            studentId,
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Availability validation failed for PRIVATE session: ${msg}`,
          );
          return;
        }

        // Use transaction to atomically create session and booking
        const result = await this.sessionRepository.manager.transaction(
          async (transactionalEntityManager) => {
            // Create session
            const session = transactionalEntityManager.create(Session, {
              type: ServiceType.PRIVATE,
              teacherId: parseInt(String(metadata.teacher_id), 10),
              startAt: new Date(String(metadata.start_at)),
              endAt: new Date(String(metadata.end_at)),
              capacityMax: 1, // Private sessions have capacity of 1
              status: SessionStatus.SCHEDULED,
              visibility: SessionVisibility.PRIVATE,
              requiresEnrollment: false,
              sourceTimezone: "UTC", // Store in UTC
            });

            const savedSession = await transactionalEntityManager.save(
              Session,
              session,
            );

            // Create booking immediately after session creation
            const booking = transactionalEntityManager.create(Booking, {
              sessionId: savedSession.id,
              studentId,
              status: BookingStatus.CONFIRMED,
              acceptedAt: new Date(),
            });

            await transactionalEntityManager.save(Booking, booking);

            return { session: savedSession, booking };
          },
        );

        sessionId = result.session.id;

        this.logger.log(
          `Created new PRIVATE session ${sessionId} and booking for student ${studentId} in single transaction`,
        );
      }

      // For GROUP/COURSE sessions, create booking only (session already exists)
      if (metadata.session_id) {
        // Use transaction for booking creation to ensure consistency
        await this.sessionRepository.manager.transaction(
          async (transactionalEntityManager) => {
            const booking = transactionalEntityManager.create(Booking, {
              sessionId,
              studentId,
              status: BookingStatus.CONFIRMED,
              acceptedAt: new Date(),
            });

            await transactionalEntityManager.save(Booking, booking);
          },
        );

        this.logger.log(
          `Created booking for existing ${serviceType} session ${sessionId} and student ${studentId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Error creating session and booking from intent:",
        error as Error,
      );
      // Don't throw - we don't want webhook processing to fail
    }
  }

  // Cache for Stripe publishable key (unlikely to change)
  private cachedPublishableKey: string | null = null;

  getStripePublishableKey(): { publishableKey: string } {
    if (!this.cachedPublishableKey) {
      const key = this.configService.get<string>("stripe.publishableKey");
      if (!key) {
        throw new Error("Stripe publishable key is not configured");
      }
      this.cachedPublishableKey = key;
    }
    return { publishableKey: this.cachedPublishableKey };
  }

  /**
   * Create draft PRIVATE session and pending booking for a student.
   * Returns the created draft session and booking ids.
   */
  private async createDraftPrivateSessionAndBooking(
    student: Student,
    bookingData: PrivateSessionBookingData,
  ): Promise<{ sessionId: number; bookingId: number }> {
    // Validate availability before creating draft
    await this.sessionsService.validatePrivateSession({
      teacherId: bookingData.teacherId || 0,
      startAt: bookingData.start,
      endAt: bookingData.end,
      studentId: student.id,
    });

    // Create draft session + pending booking inside a transaction
    const { sessionId, bookingId } =
      await this.sessionRepository.manager.transaction(async (tx) => {
        const draftSession = tx.create(Session, {
          type: ServiceType.PRIVATE,
          teacherId: bookingData.teacherId || 0,
          startAt: new Date(bookingData.start),
          endAt: new Date(bookingData.end),
          capacityMax: 1,
          status: SessionStatus.DRAFT,
          visibility: SessionVisibility.PRIVATE,
          requiresEnrollment: false,
          sourceTimezone: "UTC",
        });
        const savedSession = await tx.save(Session, draftSession);

        const pendingBooking = tx.create(Booking, {
          sessionId: savedSession.id,
          studentId: student.id,
          status: BookingStatus.PENDING,
          invitedAt: new Date(),
        });
        const savedBooking = await tx.save(Booking, pendingBooking);

        return { sessionId: savedSession.id, bookingId: savedBooking.id };
      });

    return { sessionId, bookingId };
  }

  /**
   * Create a payment session for either a private or group booking
   * @param priceId Stripe price ID
   * @param bookingData Data for either private or group session booking
   * @param userId User making the booking
   * @returns Payment session client secret
   */
  async createPaymentSession(
    priceId: string,
    bookingData: PrivateSessionBookingData | GroupSessionBookingData,
    userId: number,
  ): Promise<{ clientSecret: string }> {
    // Get the student record and validate
    const student = await this.studentRepository.findOne({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student record not found for user ${userId}`,
      );
    }

    // Create or get Stripe customer
    const stripeCustomerId =
      student.stripeCustomerId ??
      (await this.getOrCreateStripeCustomerId(userId, student.id));

    // Get the price details from Stripe
    const stripePrice = await this.stripe.prices.retrieve(priceId);

    if (!stripePrice.active) {
      throw new BadRequestException("Selected package is no longer available");
    }

    // Handle booking creation based on type (using type guard for proper narrowing)
    const { sessionId, bookingId, metadata } = await this.processBookingByType(
      bookingData,
      student,
    );

    // Create PaymentIntent referencing draft records
    const paymentIntentMetadata =
      StripeMetadataUtils.createPaymentIntentMetadata({
        studentId: student.id,
        userId,
        serviceType: metadata.serviceType,
        teacherId: metadata.teacherId,
        startAt: metadata.startAt,
        endAt: metadata.endAt,
        productId: stripePrice.product as string,
        priceId: stripePrice.id,
        notes: `Package purchase - ${JSON.stringify(bookingData)}`,
        source: "booking-confirmation",
      });

    // Inject draft IDs
    paymentIntentMetadata.session_id = sessionId.toString();
    paymentIntentMetadata.booking_id = bookingId.toString();

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

  /**
   * Type guard to check if booking data is for a group session
   */
  private isGroupSessionBookingData(
    bookingData: PrivateSessionBookingData | GroupSessionBookingData,
  ): bookingData is GroupSessionBookingData {
    return "sessionId" in bookingData;
  }

  /**
   * Process booking creation based on type (Group or Private)
   * @returns Session ID, Booking ID, and metadata for the payment intent
   */
  private async processBookingByType(
    bookingData: PrivateSessionBookingData | GroupSessionBookingData,
    student: Student,
  ): Promise<{
    sessionId: number;
    bookingId: number;
    metadata: {
      serviceType: ServiceType;
      teacherId: number;
      startAt: string;
      endAt: string;
    };
  }> {
    // Use type guard for proper type narrowing
    if (this.isGroupSessionBookingData(bookingData)) {
      return this.processGroupSessionBooking(bookingData, student);
    } else {
      return this.processPrivateSessionBooking(bookingData, student);
    }
  }

  /**
   * Process group session booking
   */
  private async processGroupSessionBooking(
    bookingData: GroupSessionBookingData,
    student: Student,
  ) {
    // Verify session exists and is the correct type
    const existingSession = await this.sessionRepository.findOne({
      where: { id: bookingData.sessionId },
    });

    if (!existingSession) {
      throw new NotFoundException(`Session ${bookingData.sessionId} not found`);
    }

    if (existingSession.type !== ServiceType.GROUP) {
      throw new BadRequestException(
        `Session ${bookingData.sessionId} is not a group session`,
      );
    }

    // Prevent duplicate booking for the same student/session
    const existingBooking = await this.bookingRepository.findOne({
      where: { sessionId: bookingData.sessionId, studentId: student.id },
    });

    if (existingBooking) {
      throw new BadRequestException(
        `Student already has a booking for session ${bookingData.sessionId}`,
      );
    }

    // Create pending booking for existing session (promoted on successful payment)
    const saved = await this.sessionRepository.manager.transaction(
      async (tx) => {
        const booking = tx.create(Booking, {
          sessionId: bookingData.sessionId,
          studentId: student.id,
          status: BookingStatus.PENDING,
          invitedAt: new Date(),
        });
        return tx.save(Booking, booking);
      },
    );

    return {
      sessionId: bookingData.sessionId,
      bookingId: saved.id,
      metadata: {
        serviceType: ServiceType.GROUP,
        teacherId: 0, // Not needed for group bookings
        startAt: "", // Not needed for group bookings
        endAt: "", // Not needed for group bookings
      },
    };
  }

  /**
   * Process private session booking
   */
  private async processPrivateSessionBooking(
    bookingData: PrivateSessionBookingData,
    student: Student,
  ) {
    try {
      const { sessionId, bookingId } =
        await this.createDraftPrivateSessionAndBooking(student, bookingData);

      return {
        sessionId,
        bookingId,
        metadata: {
          serviceType:
            (bookingData.serviceType as ServiceType) || ServiceType.PRIVATE,
          teacherId: bookingData.teacherId || 0,
          startAt: bookingData.start || "",
          endAt: bookingData.end || "",
        },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Failed to create draft private session/booking: ${msg}`,
      );
      throw new BadRequestException(`Availability validation failed: ${msg}`);
    }
  }
}
