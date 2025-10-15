import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../payments/entities/booking.entity.js';
import { Session, SessionStatus } from '../sessions/entities/session.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { StudentPackage } from '../packages/entities/student-package.entity.js';
import { PoliciesService } from '../policies/policies.service.js';
import { ServiceType } from '../common/types/class-types.js';
import { WaitlistsService } from '../waitlists/waitlists.service.js';
import { z } from 'zod';
import {
  canUsePackageForSession,
  isCrossTierBooking,
  calculateCreditsRequired,
  getCrossTierWarningMessage,
} from '../common/types/credit-tiers.js';

export const CancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export type CancelBookingDto = z.infer<typeof CancelBookingSchema>;

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
    private readonly policiesService: PoliciesService,
    private readonly waitlistsService: WaitlistsService,
  ) {}

  async createBooking(
    studentId: number,
    sessionId: number,
    studentPackageId?: number,
    confirmed?: boolean,
  ): Promise<Booking> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['teacher'],
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Session is not scheduled');
    }

    const student = await this.studentRepository.findOne({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check capacity
    const enrolledCount = await this.bookingRepository.count({
      where: { sessionId, status: BookingStatus.CONFIRMED },
    });
    if (enrolledCount >= session.capacityMax) {
      throw new BadRequestException('Session is full');
    }

    let studentPackage: StudentPackage | null = null;
    let creditsCost = 1; // Default to 1 credit

    if (studentPackageId) {
      studentPackage = await this.studentPackageRepository.findOne({
        where: { id: studentPackageId, studentId },
      });
      if (!studentPackage) {
        throw new NotFoundException('Student package not found');
      }

      // Tier validation: Check if package can be used for this session
      if (!canUsePackageForSession(studentPackage, session)) {
        throw new BadRequestException(
          'This package cannot be used for this session type',
        );
      }

      // Cross-tier validation: Require confirmation for higher-tier credits
      if (isCrossTierBooking(studentPackage, session)) {
        if (!confirmed) {
          const warningMessage = getCrossTierWarningMessage(
            studentPackage,
            session,
          );
          throw new BadRequestException(
            `Cross-tier booking requires confirmation. ${warningMessage}`,
          );
        }
      }

      // Calculate credits required based on session duration
      const sessionDurationMinutes = Math.round(
        (session.endAt.getTime() - session.startAt.getTime()) / 60000,
      );
      const creditUnitMinutes =
        parseInt(String(studentPackage.metadata?.duration_minutes), 10) || 60;
      creditsCost = calculateCreditsRequired(
        sessionDurationMinutes,
        creditUnitMinutes,
      );

      // Check if package has enough credits
      if (studentPackage.remainingSessions < creditsCost) {
        throw new BadRequestException(
          `Insufficient credits. Required: ${creditsCost}, Available: ${studentPackage.remainingSessions}`,
        );
      }

      // Check if package is still valid (not expired)
      if (studentPackage.expiresAt && studentPackage.expiresAt < new Date()) {
        throw new BadRequestException('Package has expired');
      }
    }

    const booking = new Booking();
    booking.sessionId = sessionId;
    booking.studentId = studentId;
    booking.status = BookingStatus.CONFIRMED;

    if (studentPackage) {
      booking.studentPackageId = studentPackage.id;
      booking.creditsCost = creditsCost;
      studentPackage.remainingSessions -= creditsCost;
      await this.studentPackageRepository.save(studentPackage);
    }

    return this.bookingRepository.save(booking);
  }

  /**
   * Get all bookings for a student with modification metadata
   */
  async getStudentBookings(studentId: number): Promise<StudentBooking[]> {
    const bookings = await this.bookingRepository.find({
      where: { studentId, status: BookingStatus.CONFIRMED },
      relations: ['session'],
      order: { createdAt: 'DESC' },
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
      relations: ['session'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.studentId !== studentId) {
      throw new ForbiddenException('Access denied');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      return {
        canCancel: false,
        canReschedule: false,
        reason: 'Booking is not confirmed',
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
        reason = 'Cancellations and rescheduling are not allowed';
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
      relations: ['session'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.studentId !== studentId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if cancellation is allowed
    const check = await this.canModifyBooking(bookingId, studentId);
    if (!check.canCancel) {
      throw new BadRequestException(check.reason || 'Cancellation not allowed');
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
          'remainingSessions',
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
        await this.waitlistsService.handleBookingCancellation(booking.sessionId);
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
