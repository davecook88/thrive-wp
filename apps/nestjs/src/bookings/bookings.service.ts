import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Booking, BookingStatus } from "../payments/entities/booking.entity.js";
import {
  Session,
  SessionStatus,
  SessionVisibility,
} from "../sessions/entities/session.entity.js";
import { Student } from "../students/entities/student.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";
import { PackageUse } from "../packages/entities/package-use.entity.js";
import { PoliciesService } from "../policies/policies.service.js";
import { ServiceType } from "../common/types/class-types.js";
import { WaitlistsService } from "../waitlists/waitlists.service.js";
import {
  canUsePackageForSession,
  isCrossTierBooking,
  calculateCreditsRequired,
  getCrossTierWarningMessage,
} from "../common/types/credit-tiers.js";
import { CancelBookingDto } from "@thrive/shared";
import { computeRemainingCredits } from "../packages/utils/bundle-helpers.js";
import { PackageQueryBuilder } from "../packages/utils/package-query-builder.js";

export interface BookingModificationCheck {
  canCancel: boolean;
  canReschedule: boolean;
  reason?: string;
  hoursUntilSession: number;
}

export interface StudentBooking {
  id: number;
  sessionId: number;
  session: {
    startAt: string;
    endAt: string;
    teacherId: number;
  };
  status: BookingStatus;
  canCancel: boolean;
  canReschedule: boolean;
  cancellationDeadline: string | null;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(StudentPackage)
    private readonly studentPackageRepository: Repository<StudentPackage>,
    @InjectRepository(PackageUse)
    private readonly packageUseRepository: Repository<PackageUse>,
    private readonly policiesService: PoliciesService,
    private readonly waitlistsService: WaitlistsService,
  ) {}

  /**
   * Resolve or create a session based on input parameters
   */
  private async resolveSession(
    sessionId?: number,
    bookingData?: { teacherId: number; startAt: string; endAt: string },
  ): Promise<Session> {
    if (sessionId !== undefined) {
      return this.getExistingSession(sessionId);
    }

    if (bookingData) {
      return this.createPrivateSession(bookingData);
    }

    throw new BadRequestException(
      "Either sessionId or bookingData must be provided",
    );
  }

  /**
   * Get an existing session and validate it's bookable
   */
  private async getExistingSession(sessionId: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ["teacher"],
    });

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException("Session is not scheduled");
    }

    return session;
  }

  /**
   * Create a new private session from booking data
   */
  private async createPrivateSession(bookingData: {
    teacherId: number;
    startAt: string;
    endAt: string;
  }): Promise<Session> {
    const newSession = this.sessionRepository.create({
      type: ServiceType.PRIVATE,
      teacherId: bookingData.teacherId,
      startAt: new Date(bookingData.startAt),
      endAt: new Date(bookingData.endAt),
      capacityMax: 1,
      status: SessionStatus.SCHEDULED,
      visibility: SessionVisibility.PRIVATE,
      requiresEnrollment: false,
      sourceTimezone: "UTC",
    });

    return this.sessionRepository.save(newSession);
  }

  /**
   * Validate session has available capacity
   */
  private async validateSessionCapacity(
    sessionId: number,
    capacityMax: number,
  ): Promise<void> {
    const enrolledCount = await this.bookingRepository.count({
      where: { sessionId, status: BookingStatus.CONFIRMED },
    });

    if (enrolledCount >= capacityMax) {
      throw new BadRequestException("Session is full");
    }
  }

  /**
   * Validate and prepare package for booking
   */
  private async validatePackageForBooking({
    studentPackageId,
    studentId,
    session,
    confirmed,
    allowanceId,
  }: {
    studentPackageId: number;
    studentId: number;
    session: Session;
    confirmed: boolean;
    allowanceId?: number;
  }): Promise<{
    studentPackage: StudentPackage;
    creditsCost: number;
    allowanceId: number;
  }> {
    const studentPackage = await this.studentPackageRepository.findOne({
      where: { id: studentPackageId, studentId },
      loadEagerRelations: true,
      relations: ["stripeProductMap", "stripeProductMap.allowances"],
    });

    if (!studentPackage) {
      throw new NotFoundException("Student package not found");
    }

    // Tier validation - returns the allowance to use
    const { canUse, allowance } = canUsePackageForSession({
      pkg: studentPackage,
      session,
      allowanceId,
    });

    if (!canUse || !allowance) {
      throw new BadRequestException(
        "This package cannot be used for this session type",
      );
    }

    // Cross-tier validation
    const { isCrossTier } = isCrossTierBooking(
      studentPackage,
      session,
      allowance.id,
    );
    if (isCrossTier && !confirmed) {
      const warningMessage = getCrossTierWarningMessage(
        studentPackage,
        session,
        allowance.id,
      );
      throw new BadRequestException(
        `Cross-tier booking requires confirmation. ${warningMessage}`,
      );
    }

    // Calculate credits required using the allowance's credit unit
    const sessionDurationMinutes = Math.round(
      (session.endAt.getTime() - session.startAt.getTime()) / 60000,
    );
    const creditsCost = calculateCreditsRequired(
      sessionDurationMinutes,
      allowance.creditUnitMinutes,
    );

    // Load package with uses and validate remaining credits
    const pkgWithUses =
      await PackageQueryBuilder.buildStudentPackageWithUsesQuery(
        this.studentPackageRepository,
        studentId,
        studentPackage.id,
      ).getOne();

    if (!pkgWithUses) {
      throw new NotFoundException("Student package not found");
    }

    const remaining = computeRemainingCredits(
      pkgWithUses.totalSessions,
      pkgWithUses.uses || [],
    );

    if (remaining < creditsCost) {
      throw new BadRequestException(
        `Insufficient credits. Required: ${creditsCost}, Available: ${remaining}`,
      );
    }

    if (pkgWithUses.expiresAt && pkgWithUses.expiresAt < new Date()) {
      throw new BadRequestException("Package has expired");
    }

    return {
      studentPackage: pkgWithUses,
      creditsCost,
      allowanceId: allowance.id,
    };
  }

  /**
   * Create package use record and link to booking
   */
  private async createPackageUse(
    studentPackageId: number,
    sessionId: number,
    creditsCost: number,
    studentId: number,
    allowanceId: number,
  ): Promise<number> {
    const use = this.packageUseRepository.create({
      studentPackageId,
      sessionId,
      creditsUsed: creditsCost,
      usedAt: new Date(),
      usedBy: studentId,
      allowanceId,
    });

    const savedUse = await this.packageUseRepository
      .save(use)
      .catch((error) => {
        throw new BadRequestException(`Failed to create package use: ${error}`);
      });
    if (!savedUse || !savedUse.id) {
      throw new BadRequestException(
        `Failed to create package use: Unknown error`,
      );
    }
    return savedUse.id;
  }

  async createBooking({
    userId,
    sessionId,
    bookingData,
    studentPackageId,
    confirmed,
    allowanceId,
  }: {
    userId: number;
    sessionId?: number;
    bookingData?: { teacherId: number; startAt: string; endAt: string };
    studentPackageId: number;
    confirmed?: boolean;
    allowanceId: number;
  }): Promise<Booking> {
    // Resolve student
    const student = await this.studentRepository.findOne({
      where: { userId },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    // Resolve or create session
    const session = await this.resolveSession(sessionId, bookingData);

    // Validate capacity
    await this.validateSessionCapacity(session.id, session.capacityMax);

    // Validate package and calculate credits
    let creditsCost = 1;
    let packageUseId: number | undefined;
    let selectedAllowanceId: number | undefined;

    if (studentPackageId) {
      const packageValidation = await this.validatePackageForBooking({
        studentPackageId,
        studentId: student.id,
        session,
        confirmed: confirmed ?? false,
        allowanceId,
      });

      creditsCost = packageValidation.creditsCost;
      selectedAllowanceId = packageValidation.allowanceId;

      // Create package use record
      packageUseId = await this.createPackageUse(
        studentPackageId,
        session.id,
        creditsCost,
        student.id,
        selectedAllowanceId,
      );
    }

    // Create and save booking
    const booking = this.bookingRepository.create({
      sessionId: session.id,
      studentId: student.id,
      status: BookingStatus.CONFIRMED,
      studentPackageId: studentPackageId || undefined,
      creditsCost,
      packageUseId,
    });

    return this.bookingRepository.save(booking);
  }

  /**
   * Get all bookings for a student with modification metadata
   */
  async getStudentBookings(studentId: number): Promise<StudentBooking[]> {
    const bookings = await this.bookingRepository.find({
      where: { studentId, status: BookingStatus.CONFIRMED },
      relations: ["session"],
      order: { createdAt: "DESC" },
    });

    const policy = await this.policiesService.getActivePolicy();

    const result: StudentBooking[] = [];
    for (const booking of bookings) {
      const check = await this.canModifyBooking(booking.id, studentId);
      result.push({
        id: booking.id,
        sessionId: booking.sessionId,
        session: {
          startAt: booking.session.startAt.toISOString(),
          endAt: booking.session.endAt.toISOString(),
          teacherId: booking.session.teacherId,
        },
        status: booking.status,
        canCancel: check.canCancel,
        canReschedule: check.canReschedule,
        cancellationDeadline: this.calculateCancellationDeadline(
          booking.session.startAt,
          policy.cancellationDeadlineHours,
        ),
      });
    }

    return result;
  }

  /**
   * Check if a student can modify (cancel/reschedule) a booking
   */
  async canModifyBooking(
    bookingId: number,
    studentId: number,
  ): Promise<BookingModificationCheck> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ["session"],
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.studentId !== studentId) {
      throw new ForbiddenException("Access denied");
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      return {
        canCancel: false,
        canReschedule: false,
        reason: "Booking is not confirmed",
        hoursUntilSession: 0,
      };
    }

    const policy = await this.policiesService.getActivePolicy();
    const now = new Date();
    const hoursUntilSession =
      (booking.session.startAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    const canCancel =
      policy.allowCancellation &&
      hoursUntilSession >= policy.cancellationDeadlineHours;

    const canReschedule =
      policy.allowRescheduling &&
      hoursUntilSession >= policy.reschedulingDeadlineHours &&
      booking.rescheduledCount < policy.maxReschedulesPerBooking;

    let reason: string | undefined;
    if (!canCancel && !canReschedule) {
      if (!policy.allowCancellation && !policy.allowRescheduling) {
        reason = "Cancellations and rescheduling are not allowed";
      } else if (
        hoursUntilSession <
        Math.min(
          policy.cancellationDeadlineHours,
          policy.reschedulingDeadlineHours,
        )
      ) {
        reason = `Too late to modify (must be at least ${Math.min(
          policy.cancellationDeadlineHours,
          policy.reschedulingDeadlineHours,
        )} hours before session)`;
      } else if (booking.rescheduledCount >= policy.maxReschedulesPerBooking) {
        reason = `Maximum reschedules reached (${policy.maxReschedulesPerBooking})`;
      }
    }

    return {
      canCancel,
      canReschedule,
      reason,
      hoursUntilSession,
    };
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    bookingId: number,
    studentId: number,
    dto: CancelBookingDto,
  ): Promise<{
    success: boolean;
    creditRefunded: boolean;
    refundedToPackageId?: number;
  }> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ["session"],
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.studentId !== studentId) {
      throw new ForbiddenException("Access denied");
    }

    // Check if cancellation is allowed
    const check = await this.canModifyBooking(bookingId, studentId);
    if (!check.canCancel) {
      throw new BadRequestException(check.reason || "Cancellation not allowed");
    }

    const policy = await this.policiesService.getActivePolicy();

    let creditRefunded = false;
    let refundedToPackageId: number | undefined;

    // Start transaction
    await this.bookingRepository.manager.transaction(async (manager) => {
      // Update booking
      await manager.update(Booking, bookingId, {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: dto.reason,
        cancelledByStudent: true,
      });

      // Refund credits if applicable
      if (booking.studentPackageId && policy.refundCreditsOnCancel) {
        // Increment remaining sessions on the package
        await manager.increment(
          StudentPackage,
          { id: booking.studentPackageId },
          "remainingSessions",
          booking.creditsCost || 1,
        );
        creditRefunded = true;
        refundedToPackageId = booking.studentPackageId;
      }

      // If this is a PRIVATE session, cancel the session too
      if (booking.session.type === ServiceType.PRIVATE) {
        await manager.update(Session, booking.sessionId, {
          status: SessionStatus.CANCELLED,
        });
      } else if (booking.session.type === ServiceType.GROUP) {
        // For group sessions, we just remove the booking, but the session remains active
        // and we might want to notify the waitlist
        await this.waitlistsService.handleBookingCancellation(
          booking.sessionId,
        );
      }
    });

    return {
      success: true,
      creditRefunded,
      refundedToPackageId,
    };
  }

  private calculateCancellationDeadline(
    sessionStart: Date,
    deadlineHours: number,
  ): string | null {
    const deadline = new Date(
      sessionStart.getTime() - deadlineHours * 60 * 60 * 1000,
    );
    return deadline.toISOString();
  }
}
