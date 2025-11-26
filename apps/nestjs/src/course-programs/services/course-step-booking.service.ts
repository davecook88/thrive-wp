import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager } from "typeorm";
import {
  Booking,
  BookingStatus,
  BookingType,
} from "../../payments/entities/booking.entity.js";
import { StudentCourseStepProgress } from "../entities/student-course-step-progress.entity.js";
import { StudentPackage } from "../../packages/entities/student-package.entity.js";
import { CourseStepOption } from "../entities/course-step-option.entity.js";
import { CourseCohortSession } from "../entities/course-cohort-session.entity.js";
import { Session } from "../../sessions/entities/session.entity.js";
import { GroupClass } from "../../group-classes/entities/group-class.entity.js";

export interface CourseStepBookingResult {
  booking: Booking;
  progress: StudentCourseStepProgress;
}

export interface BulkBookingResult {
  bookings: CourseStepBookingResult[];
  autoBooked: number[]; // Step IDs that were auto-booked
  manualSelections: number[]; // Step IDs that were manually selected
}

/**
 * CourseStepBookingService handles booking of course step sessions.
 * This service creates proper Booking entities for course step bookings,
 * unifying course bookings with the standard booking system.
 */
@Injectable()
export class CourseStepBookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(StudentCourseStepProgress)
    private readonly progressRepository: Repository<StudentCourseStepProgress>,
    @InjectRepository(StudentPackage)
    private readonly packageRepository: Repository<StudentPackage>,
    @InjectRepository(CourseStepOption)
    private readonly optionRepository: Repository<CourseStepOption>,
    @InjectRepository(CourseCohortSession)
    private readonly cohortSessionRepository: Repository<CourseCohortSession>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(GroupClass)
    private readonly groupClassRepository: Repository<GroupClass>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Book a single course step session
   */
  async bookStepSession(
    studentId: number,
    packageId: number,
    stepId: number,
    courseStepOptionId: number,
  ): Promise<CourseStepBookingResult> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Validate package ownership
      const studentPackage = await this.validatePackageOwnership(
        studentId,
        packageId,
        manager,
      );

      // 2. Get progress record
      const progress = await manager.findOne(StudentCourseStepProgress, {
        where: { studentPackageId: packageId, courseStepId: stepId },
        relations: ["courseStep"],
      });

      if (!progress) {
        throw new NotFoundException(
          `Progress record not found for step ${stepId}`,
        );
      }

      if (progress.status !== "UNBOOKED") {
        throw new BadRequestException(
          `Step is already ${progress.status.toLowerCase()}`,
        );
      }

      // 3. Get and validate the session option
      const cohortId = studentPackage.metadata?.cohortId as number | undefined;
      const { session, groupClass } = await this.resolveSessionFromOption(
        courseStepOptionId,
        stepId,
        cohortId,
        manager,
      );

      // 4. Check capacity
      await this.validateSessionCapacity(session.id, manager);

      // 5. Create Booking entity
      const booking = manager.create(Booking, {
        studentId: studentPackage.studentId,
        sessionId: session.id,
        bookingType: BookingType.COURSE_STEP,
        status: BookingStatus.CONFIRMED,
        courseStepId: stepId,
        studentPackageId: packageId,
        metadata: {
          stepOrder: progress.courseStep?.stepOrder,
          stepLabel: progress.courseStep?.label,
          packageName: studentPackage.packageName,
          cohortId: studentPackage.metadata?.cohortId,
        },
      });

      await manager.save(Booking, booking);

      // 6. Update progress record
      progress.status = "BOOKED";
      progress.bookingId = booking.id;
      progress.sessionId = session.id; // Store actual session ID
      progress.bookedAt = new Date();

      await manager.save(StudentCourseStepProgress, progress);

      // Note: Email notifications should be handled by a separate event listener
      // that listens for booking creation events

      return { booking, progress };
    });
  }

  /**
   * Change an existing course step session booking
   */
  async changeStepSession(
    studentId: number,
    packageId: number,
    stepId: number,
    newCourseStepOptionId: number,
  ): Promise<CourseStepBookingResult> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Validate package ownership
      await this.validatePackageOwnership(studentId, packageId, manager);

      // 2. Get existing progress with booking
      const progress = await manager.findOne(StudentCourseStepProgress, {
        where: { studentPackageId: packageId, courseStepId: stepId },
        relations: ["booking", "booking.session", "courseStep"],
      });

      if (!progress || progress.status !== "BOOKED" || !progress.booking) {
        throw new BadRequestException("No existing booking to change");
      }

      // 3. Check if change is allowed (24-hour window)
      const cancellationWindow = 24; // hours
      const sessionStartTime = progress.booking.session.startAt;
      const hoursUntilSession =
        (sessionStartTime.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilSession < cancellationWindow) {
        throw new BadRequestException(
          `Cannot change booking within ${cancellationWindow} hours of session`,
        );
      }

      // 4. Cancel old booking
      progress.booking.status = BookingStatus.CANCELLED;
      progress.booking.cancelledAt = new Date();
      progress.booking.cancellationReason =
        "Student changed to different session";
      progress.booking.cancelledByStudent = true;

      await manager.save(Booking, progress.booking);

      // 5. Book new session (reuse bookStepSession logic)
      // First reset progress status
      progress.status = "UNBOOKED";
      progress.bookingId = undefined;
      progress.sessionId = undefined;
      progress.bookedAt = undefined;
      await manager.save(StudentCourseStepProgress, progress);

      // Now book the new session
      return this.bookStepSession(
        studentId,
        packageId,
        stepId,
        newCourseStepOptionId,
      );
    });
  }

  /**
   * Bulk book multiple course step sessions (used after purchase)
   */
  async bulkBookStepSessions(
    studentId: number,
    packageId: number,
    selections: { courseStepId: number; courseStepOptionId: number }[],
  ): Promise<BulkBookingResult> {
    const autoBooked: number[] = [];
    const manualSelections: number[] = [];
    const bookings: CourseStepBookingResult[] = [];

    await this.dataSource.transaction(async (manager) => {
      // 1. Validate package ownership
      const studentPackage = await this.validatePackageOwnership(
        studentId,
        packageId,
        manager,
      );

      const cohortId = studentPackage.metadata?.cohortId as number | undefined;

      if (!cohortId) {
        throw new BadRequestException(
          "Package is not associated with a cohort",
        );
      }

      // 2. Get all cohort sessions for this cohort
      const cohortSessions = await manager.find(CourseCohortSession, {
        where: { cohortId },
        relations: ["courseStepOption", "courseStepOption.groupClass"],
      });

      // 3. Get all progress records for this package
      const progressRecords = await manager.find(StudentCourseStepProgress, {
        where: { studentPackageId: packageId },
        relations: ["courseStep"],
      });

      // 4. Group cohort sessions by step
      const sessionsByStep = new Map<number, CourseCohortSession[]>();
      for (const cs of cohortSessions) {
        if (!sessionsByStep.has(cs.courseStepId)) {
          sessionsByStep.set(cs.courseStepId, []);
        }
        sessionsByStep.get(cs.courseStepId)!.push(cs);
      }

      // 5. Process each progress record
      for (const progress of progressRecords) {
        if (progress.status !== "UNBOOKED") {
          continue; // Skip already booked steps
        }

        const stepOptions = sessionsByStep.get(progress.courseStepId) || [];

        let selectedOptionId: number | null = null;

        if (stepOptions.length === 1) {
          // Auto-book single option
          selectedOptionId = stepOptions[0].courseStepOptionId;
          autoBooked.push(progress.courseStepId);
        } else if (stepOptions.length > 1) {
          // Multiple options: check for manual selection
          const selection = selections.find(
            (s) => s.courseStepId === progress.courseStepId,
          );
          if (selection) {
            // Verify the selected option is valid for this cohort/step
            const isValid = stepOptions.some(
              (opt) => opt.courseStepOptionId === selection.courseStepOptionId,
            );
            if (!isValid) {
              throw new BadRequestException(
                `Selected option ${selection.courseStepOptionId} is not available for step ${progress.courseStepId}`,
              );
            }
            selectedOptionId = selection.courseStepOptionId;
            manualSelections.push(progress.courseStepId);
          } else {
            // No selection yet, leave unbooked
            continue;
          }
        }

        if (selectedOptionId) {
          // Book the session using the unified booking method
          const { session, groupClass } = await this.resolveSessionFromOption(
            selectedOptionId,
            progress.courseStepId,
            cohortId,
            manager,
          );

          // Check capacity
          await this.validateSessionCapacity(session.id, manager);

          // Create Booking entity
          const booking = manager.create(Booking, {
            studentId: studentPackage.studentId,
            sessionId: session.id,
            bookingType: BookingType.COURSE_STEP,
            status: BookingStatus.CONFIRMED,
            courseStepId: progress.courseStepId,
            studentPackageId: packageId,
            metadata: {
              stepOrder: progress.courseStep?.stepOrder,
              stepLabel: progress.courseStep?.label,
              packageName: studentPackage.packageName,
              cohortId: cohortId,
              bulkBooked: true,
            },
          });

          await manager.save(Booking, booking);

          // Update progress
          progress.status = "BOOKED";
          progress.bookingId = booking.id;
          progress.sessionId = session.id;
          progress.bookedAt = new Date();

          await manager.save(StudentCourseStepProgress, progress);

          bookings.push({ booking, progress });
        }
      }
    });

    return { bookings, autoBooked, manualSelections };
  }

  /**
   * Cancel a course step booking
   */
  async cancelStepBooking(
    studentId: number,
    packageId: number,
    stepId: number,
    reason?: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // 1. Validate package ownership
      await this.validatePackageOwnership(studentId, packageId, manager);

      // 2. Get progress with booking
      const progress = await manager.findOne(StudentCourseStepProgress, {
        where: { studentPackageId: packageId, courseStepId: stepId },
        relations: ["booking", "booking.session"],
      });

      if (!progress || progress.status !== "BOOKED" || !progress.booking) {
        throw new BadRequestException("No booking to cancel");
      }

      // 3. Check cancellation window
      const cancellationWindow = 24; // hours
      const sessionStartTime = progress.booking.session.startAt;
      const hoursUntilSession =
        (sessionStartTime.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilSession < cancellationWindow) {
        throw new BadRequestException(
          `Cannot cancel booking within ${cancellationWindow} hours of session`,
        );
      }

      // 4. Cancel booking
      progress.booking.status = BookingStatus.CANCELLED;
      progress.booking.cancelledAt = new Date();
      progress.booking.cancellationReason = reason || "Cancelled by student";
      progress.booking.cancelledByStudent = true;

      await manager.save(Booking, progress.booking);

      // 5. Update progress status
      progress.status = "CANCELLED";

      await manager.save(StudentCourseStepProgress, progress);
    });
  }

  // ==================== Private Helper Methods ====================

  /**
   * Validate that the student owns the package
   */
  private async validatePackageOwnership(
    studentId: number,
    packageId: number,
    manager: EntityManager,
  ): Promise<StudentPackage> {
    const pkg = await manager.findOne(StudentPackage, {
      where: { id: packageId, studentId: studentId },
    });

    if (!pkg) {
      throw new BadRequestException("Package does not belong to student");
    }

    return pkg;
  }

  /**
   * Resolve the actual Session from a CourseStepOption
   * Returns the next available session for the associated group class
   */
  private async resolveSessionFromOption(
    courseStepOptionId: number,
    stepId: number,
    cohortId: number | undefined,
    manager: EntityManager,
  ): Promise<{ session: Session; groupClass: GroupClass }> {
    // Get the course step option
    const option = await manager.findOne(CourseStepOption, {
      where: { id: courseStepOptionId, courseStepId: stepId },
      relations: ["groupClass"],
    });

    if (!option || !option.isActive) {
      throw new NotFoundException("Course step option not found or inactive");
    }

    // Verify this option is part of the cohort (if cohort specified)
    if (cohortId) {
      const cohortSession = await manager.findOne(CourseCohortSession, {
        where: {
          cohortId,
          courseStepOptionId,
        },
      });

      if (!cohortSession) {
        throw new BadRequestException(
          "Selected option is not available for this cohort",
        );
      }
    }

    // Get the next available session for this group class
    const now = new Date();
    const session = await manager.findOne(Session, {
      where: {
        groupClassId: option.groupClassId,
      },
      order: {
        startAt: "ASC",
      },
    });

    if (!session) {
      throw new NotFoundException(
        "No available sessions for this course step option",
      );
    }

    return { session, groupClass: option.groupClass };
  }

  /**
   * Validate that the session has available capacity
   */
  private async validateSessionCapacity(
    sessionId: number,
    manager: EntityManager,
  ): Promise<void> {
    const session = await manager.findOne(Session, {
      where: { id: sessionId },
      relations: ["groupClass"],
    });

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    // Count confirmed bookings for this session
    const confirmedCount = await manager.count(Booking, {
      where: {
        sessionId: sessionId,
        status: BookingStatus.CONFIRMED,
      },
    });

    const capacityMax = session.groupClass?.capacityMax ?? session.capacityMax;

    if (confirmedCount >= capacityMax) {
      throw new BadRequestException("Session is full");
    }
  }
}
