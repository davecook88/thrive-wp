import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager } from "typeorm";
import { StudentCourseStepProgress } from "../entities/student-course-step-progress.entity.js";
import { CourseStep } from "../entities/course-step.entity.js";
import { CourseCohortSession } from "../entities/course-cohort-session.entity.js";
import { CourseStepOption } from "../entities/course-step-option.entity.js";
import { StudentPackage } from "../../packages/entities/student-package.entity.js";
import { BookingStatus } from "../../payments/entities/booking.entity.js";

/**
 * CourseStepProgressService manages student progress through course steps.
 *
 * Responsibilities:
 * - Seed progress rows when a course package is purchased
 * - Update progress status when steps are booked/completed
 * - Query progress for student dashboards
 *
 * Note: This service does NOT create PackageUse records.
 * Courses use enrollment-based access, not credit consumption.
 */
@Injectable()
export class CourseStepProgressService {
  constructor(
    @InjectRepository(StudentCourseStepProgress)
    private readonly progressRepo: Repository<StudentCourseStepProgress>,
    @InjectRepository(CourseStep)
    private readonly courseStepRepo: Repository<CourseStep>,
    @InjectRepository(CourseCohortSession)
    private readonly cohortSessionRepo: Repository<CourseCohortSession>,
    @InjectRepository(CourseStepOption)
    private readonly stepOptionRepo: Repository<CourseStepOption>,
    @InjectRepository(StudentPackage)
    private readonly packageRepo: Repository<StudentPackage>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Seed progress rows for all steps in a course when purchased.
   * Called by the Stripe webhook handler after creating StudentPackage.
   *
   * @param studentPackageId - The StudentPackage.id (course purchase)
   * @param courseProgramId - The CourseProgram.id
   * @param cohortId - Optional CourseCohort.id for cohort-based enrollments
   * @param manager - Optional EntityManager for use within transactions
   */
  async seedProgressForCourse(
    studentPackageId: number,
    courseProgramId: number,
    cohortId?: number,
    manager?: EntityManager,
  ): Promise<StudentCourseStepProgress[]> {
    const em = manager || this.courseStepRepo.manager;

    // Get all steps for this course
    const steps = await em.find(CourseStep, {
      where: { courseProgramId },
      order: { stepOrder: "ASC" },
    });

    if (steps.length === 0) {
      throw new NotFoundException(
        `No steps found for course program ${courseProgramId}`,
      );
    }

    // Check if progress already exists for this package (idempotency)
    const existingProgress = await em.find(StudentCourseStepProgress, {
      where: { studentPackageId },
    });

    if (existingProgress.length > 0) {
      // Progress already seeded, return existing records
      return existingProgress;
    }

    // Create progress records for all steps
    const progressRecords = steps.map((step) => {
      const progress = new StudentCourseStepProgress();
      progress.studentPackageId = studentPackageId;
      progress.courseStepId = step.id;
      progress.cohortId = cohortId !== undefined ? cohortId : undefined;
      progress.status = "UNBOOKED";
      return progress;
    });

    return em.save(StudentCourseStepProgress, progressRecords);
  }

  /**
   * Mark a course step as booked.
   *
   * @param studentPackageId - The StudentPackage.id
   * @param courseStepId - The CourseStep.id
   * @param sessionId - The Session.id
   */
  async markStepBooked(
    studentPackageId: number,
    courseStepId: number,
    sessionId: number,
  ): Promise<StudentCourseStepProgress> {
    const progress = await this.progressRepo.findOne({
      where: { studentPackageId, courseStepId },
    });

    if (!progress) {
      throw new NotFoundException(
        `Progress record not found for package ${studentPackageId}, step ${courseStepId}`,
      );
    }

    if (progress.status !== "UNBOOKED") {
      throw new Error(
        `Step ${courseStepId} is already ${progress.status}, cannot book`,
      );
    }

    progress.status = "BOOKED";
    progress.sessionId = sessionId;
    progress.bookedAt = new Date();

    return this.progressRepo.save(progress);
  }

  /**
   * Mark a course step as completed.
   *
   * @param studentPackageId - The StudentPackage.id
   * @param courseStepId - The CourseStep.id
   */
  async markStepCompleted(
    studentPackageId: number,
    courseStepId: number,
  ): Promise<StudentCourseStepProgress> {
    const progress = await this.progressRepo.findOne({
      where: { studentPackageId, courseStepId },
    });

    if (!progress) {
      throw new NotFoundException(
        `Progress record not found for package ${studentPackageId}, step ${courseStepId}`,
      );
    }

    if (progress.status !== "BOOKED") {
      throw new Error(
        `Step ${courseStepId} is ${progress.status}, must be BOOKED to complete`,
      );
    }

    progress.status = "COMPLETED";
    progress.completedAt = new Date();

    return this.progressRepo.save(progress);
  }

  /**
   * Cancel a booked course step.
   *
   * @param studentPackageId - The StudentPackage.id
   * @param courseStepId - The CourseStep.id
   */
  async cancelStep(
    studentPackageId: number,
    courseStepId: number,
  ): Promise<StudentCourseStepProgress> {
    const progress = await this.progressRepo.findOne({
      where: { studentPackageId, courseStepId },
    });

    if (!progress) {
      throw new NotFoundException(
        `Progress record not found for package ${studentPackageId}, step ${courseStepId}`,
      );
    }

    // Reset to unbooked state
    progress.status = "UNBOOKED";
    progress.sessionId = undefined;
    progress.bookedAt = undefined;

    return this.progressRepo.save(progress);
  }

  /**
   * Get all progress records for a student's course package.
   *
   * @param studentPackageId - The StudentPackage.id
   */
  async getProgressForPackage(
    studentPackageId: number,
  ): Promise<StudentCourseStepProgress[]> {
    return this.progressRepo.find({
      where: { studentPackageId },
      relations: ["courseStep"],
      order: { courseStep: { stepOrder: "ASC" } },
    });
  }

  /**
   * Get progress for a specific step.
   *
   * @param studentPackageId - The StudentPackage.id
   * @param courseStepId - The CourseStep.id
   */
  async getStepProgress(
    studentPackageId: number,
    courseStepId: number,
  ): Promise<StudentCourseStepProgress | null> {
    return this.progressRepo.findOne({
      where: { studentPackageId, courseStepId },
      relations: ["courseStep"],
    });
  }

  /**
   * Check if a student has access to a specific course program.
   * Used by booking validation.
   *
   * @param studentId - The Student.id
   * @param courseProgramId - The CourseProgram.id
   */
  async hasAccessToCourse(
    studentId: number,
    courseProgramId: number,
  ): Promise<boolean> {
    const progress = await this.progressRepo
      .createQueryBuilder("progress")
      .innerJoin("progress.studentPackage", "pkg")
      .innerJoin("progress.courseStep", "step")
      .where("pkg.studentId = :studentId", { studentId })
      .andWhere("step.courseProgramId = :courseProgramId", { courseProgramId })
      .andWhere("pkg.deletedAt IS NULL")
      .andWhere("(pkg.expiresAt IS NULL OR pkg.expiresAt > :now)", {
        now: new Date(),
      })
      .getOne();

    return !!progress;
  }

  /**
   * Get unbooked steps for a student package (for session selection wizard).
   * Returns steps that need manual selection with their available options.
   *
   * @param studentPackageId - The StudentPackage.id
   */
  async getUnbookedSteps(studentPackageId: number) {
    // Get package to find cohort
    const pkg = await this.packageRepo.findOne({
      where: { id: studentPackageId },
    });

    if (!pkg) {
      throw new NotFoundException("Package not found");
    }

    const cohortId = pkg.metadata?.cohortId as number | undefined;

    if (!cohortId) {
      throw new BadRequestException("Package is not associated with a cohort");
    }

    // Get all unbooked progress records
    const progressRecords = await this.progressRepo.find({
      where: { studentPackageId, status: "UNBOOKED" },
      relations: ["courseStep"],
      order: { courseStep: { stepOrder: "ASC" } },
    });

    // For each unbooked step, get its options from the cohort
    const steps = [];
    for (const progress of progressRecords) {
      const cohortSessions = await this.cohortSessionRepo.find({
        where: {
          cohortId,
          courseStepId: progress.courseStepId,
        },
        relations: [
          "courseStepOption",
          "courseStepOption.groupClass",
          "courseStepOption.groupClass.session",
          "courseStepOption.groupClass.session.bookings",
        ],
      });

      if (cohortSessions.length > 0) {
        const options = cohortSessions.map((cs) => {
          const groupClass = cs.courseStepOption.groupClass;
          const session = groupClass?.session;

          // Count confirmed bookings for this session
          const confirmedBookings =
            session?.bookings?.filter(
              (b) => b.status === BookingStatus.CONFIRMED,
            ).length || 0;

          const capacityMax = groupClass?.capacityMax || 0;
          const spotsAvailable = Math.max(0, capacityMax - confirmedBookings);

          return {
            courseStepOptionId: cs.courseStepOptionId,
            groupClassId: cs.courseStepOption.groupClassId,
            groupClassName: groupClass?.title || "Unknown",
            capacityMax,
            spotsAvailable,
            isActive: groupClass?.isActive || false,
            startAt: session?.startAt?.toISOString(),
            endAt: session?.endAt?.toISOString(),
          };
        });

        steps.push({
          stepId: progress.courseStepId,
          stepLabel: progress.courseStep.label,
          stepTitle: progress.courseStep.title,
          stepOrder: progress.courseStep.stepOrder,
          options,
        });
      }
    }

    return steps;
  }

  /**
   * Book sessions for a student's course package.
   * Auto-books single-option steps, requires manual selections for multi-option steps.
   *
   * @param studentPackageId - The StudentPackage.id
   * @param selections - Array of manual selections { courseStepId, courseStepOptionId }
   */
  async bookSessions(
    studentPackageId: number,
    selections: { courseStepId: number; courseStepOptionId: number }[],
  ) {
    // Get package with cohort info
    const pkg = await this.packageRepo.findOne({
      where: { id: studentPackageId },
    });

    if (!pkg) {
      throw new NotFoundException("Package not found");
    }

    const cohortId = pkg.metadata?.cohortId as number | undefined;

    if (!cohortId) {
      throw new BadRequestException("Package is not associated with a cohort");
    }

    const autoBooked: number[] = [];
    const manualSelections: number[] = [];
    const booked: StudentCourseStepProgress[] = [];

    await this.dataSource.transaction(async (manager) => {
      // Get all cohort sessions for this cohort
      const cohortSessions = await manager.find(CourseCohortSession, {
        where: { cohortId },
        relations: ["courseStepOption", "courseStepOption.groupClass"],
      });

      // Get all progress records for this package
      const progressRecords = await manager.find(StudentCourseStepProgress, {
        where: { studentPackageId },
        relations: ["courseStep"],
      });

      // Group cohort sessions by step
      const sessionsByStep = new Map<number, CourseCohortSession[]>();
      for (const cs of cohortSessions) {
        if (!sessionsByStep.has(cs.courseStepId)) {
          sessionsByStep.set(cs.courseStepId, []);
        }
        sessionsByStep.get(cs.courseStepId)!.push(cs);
      }

      // Process each progress record
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
          // Book the session
          const option = await manager.findOne(CourseStepOption, {
            where: { id: selectedOptionId },
            relations: ["groupClass"],
          });

          if (!option) {
            throw new NotFoundException(
              `Course step option ${selectedOptionId} not found`,
            );
          }

          // Update progress
          progress.status = "BOOKED";
          progress.sessionId = option.groupClassId; // Link to the group class
          progress.bookedAt = new Date();

          await manager.save(StudentCourseStepProgress, progress);
          booked.push(progress);

          // Note: We're not creating a Booking entity here because course sessions
          // use the StudentCourseStepProgress for tracking enrollment.
          // If you want to create Booking entities, add that logic here.
        }
      }
    });

    return { autoBooked, manualSelections, booked };
  }

  /**
   * Get all course packages for a student with progress summary.
   *
   * @param studentId - The Student.id
   */
  /**
   * Get all course packages for a student with progress summary.
   *
   * @param studentId - The Student.id
   */
  async getStudentPackages(studentId: number) {
    const packages = await this.packageRepo.find({
      where: { studentId },
      order: { purchasedAt: "DESC" },
    });

    const result = [];

    for (const pkg of packages) {
      // Only include course packages (those with metadata.courseProgramId)
      if (!pkg.metadata?.courseProgramId) {
        continue;
      }

      const courseProgramId = pkg.metadata.courseProgramId as number;
      const cohortId = pkg.metadata.cohortId as number | undefined;

      // Get progress
      const progress = await this.progressRepo.find({
        where: { studentPackageId: pkg.id },
        relations: ["courseStep"],
        order: { courseStep: { stepOrder: "ASC" } },
      });

      const totalSteps = progress.length;
      const completedSteps = progress.filter(
        (p) => p.status === "COMPLETED",
      ).length;
      const unbookedSteps = progress.filter(
        (p) => p.status === "UNBOOKED",
      ).length;

      // Find next session
      // Find next session
      // TODO: Implement next session logic
      const nextSessionAt: Date | null = null;

      const courseTitle = (pkg.metadata.courseTitle as string) || "Course";
      const courseCode = (pkg.metadata.courseCode as string) || "COURSE";
      const cohortName = (pkg.metadata.cohortName as string) || null;

      result.push({
        packageId: pkg.id,
        packageName: pkg.packageName,
        courseProgramId,
        courseCode,
        courseTitle,
        courseDescription: null, // TODO: Fetch from program
        cohortId: cohortId || null,
        cohortName,
        purchasedAt: pkg.purchasedAt.toISOString(),
        expiresAt: pkg.expiresAt?.toISOString() || null,
        progress: progress.map((p) => ({
          stepId: p.courseStepId,
          stepLabel: p.courseStep.label,
          stepTitle: p.courseStep.title,
          stepOrder: p.courseStep.stepOrder,
          status: p.status,
          bookedAt: p.bookedAt?.toISOString() || null,
          completedAt: p.completedAt?.toISOString() || null,
          sessionId: p.sessionId,
        })),
        completedSteps,
        totalSteps,
        unbookedSteps,
        nextSessionAt: null,
      });
    }

    return result;
  }

  /**
   * Get detailed view of a single course package.
   *
   * @param studentId - The Student.id
   * @param packageId - The StudentPackage.id
   */
  async getPackageDetail(studentId: number, packageId: number) {
    const pkg = await this.packageRepo.findOne({
      where: { id: packageId, studentId },
    });

    if (!pkg) {
      throw new NotFoundException("Package not found");
    }

    if (!pkg.metadata?.courseProgramId) {
      throw new BadRequestException("Not a course package");
    }

    const courseProgramId = pkg.metadata.courseProgramId as number;
    const cohortId = pkg.metadata.cohortId as number | undefined;

    // Get progress with steps
    const progress = await this.progressRepo.find({
      where: { studentPackageId: pkg.id },
      relations: ["courseStep"],
      order: { courseStep: { stepOrder: "ASC" } },
    });

    // Get sessions for booked steps
    const sessions = [];
    if (cohortId) {
      // Get all cohort sessions to find details for booked steps
      const cohortSessions = await this.cohortSessionRepo.find({
        where: { cohortId },
        relations: [
          "courseStepOption",
          "courseStepOption.groupClass",
          "courseStepOption.groupClass.session",
          "courseStepOption.groupClass.groupClassTeachers",
          "courseStepOption.groupClass.groupClassTeachers.teacher",
          "courseStepOption.groupClass.groupClassTeachers.teacher.user",
        ],
      });

      for (const p of progress) {
        if (p.status === "BOOKED" && p.sessionId) {
          // p.sessionId is actually the groupClassId in our current logic (see bookSessions)
          // We need to find the cohort session that matches this group class
          const cs = cohortSessions.find(
            (c) => c.courseStepOption.groupClassId === p.sessionId,
          );

          if (cs) {
            const groupClass = cs.courseStepOption.groupClass;
            const session = groupClass?.session;
            // Get primary teacher or first teacher
            const teacherRel =
              groupClass?.groupClassTeachers?.find((t) => t.isPrimary) ||
              groupClass?.groupClassTeachers?.[0];
            const teacher = teacherRel?.teacher;

            if (session && teacher && teacher.user) {
              sessions.push({
                sessionId: p.sessionId,
                stepId: p.courseStepId,
                stepLabel: p.courseStep.label,
                stepTitle: p.courseStep.title,
                groupClassName: groupClass.title,
                startUtc: session.startAt.toISOString(),
                endUtc: session.endAt.toISOString(),
                status: "SCHEDULED", // TODO: Check session status
                meetingUrl: session.meetingUrl,
                teacherId: teacher.id,
                teacherName: `${teacher.user?.firstName} ${teacher.user?.lastName}`,
              });
            }
          }
        }
      }
    }

    const totalSteps = progress.length;
    const completedSteps = progress.filter(
      (p) => p.status === "COMPLETED",
    ).length;
    const unbookedSteps = progress.filter(
      (p) => p.status === "UNBOOKED",
    ).length;

    const courseCode = (pkg.metadata.courseCode as string) || "COURSE";
    const courseTitle = (pkg.metadata.courseTitle as string) || "Course";
    const cohortName = (pkg.metadata.cohortName as string) || null;

    return {
      packageId: pkg.id,
      packageName: pkg.packageName,
      courseProgramId,
      courseCode,
      courseTitle,
      courseDescription: null,
      courseHeroImageUrl: null,
      cohortId: cohortId || null,
      cohortName,
      cohortStartDate: new Date().toISOString(), // TODO: Get from cohort
      cohortEndDate: new Date().toISOString(), // TODO: Get from cohort
      purchasedAt: pkg.purchasedAt.toISOString(),
      progress: progress.map((p) => ({
        stepId: p.courseStepId,
        stepLabel: p.courseStep.label,
        stepTitle: p.courseStep.title,
        stepOrder: p.courseStep.stepOrder,
        status: p.status,
        bookedAt: p.bookedAt?.toISOString() || null,
        completedAt: p.completedAt?.toISOString() || null,
        sessionId: p.sessionId,
      })),
      completedSteps,
      totalSteps,
      unbookedSteps,
      sessions,
      courseLevels: [], // TODO: Fetch levels
    };
  }
}
