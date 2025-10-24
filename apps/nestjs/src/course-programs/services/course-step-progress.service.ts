import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StudentCourseStepProgress } from "../entities/student-course-step-progress.entity.js";
import { CourseStep } from "../entities/course-step.entity.js";

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
  ) {}

  /**
   * Seed progress rows for all steps in a course when purchased.
   * Called by the Stripe webhook handler after creating StudentPackage.
   *
   * @param studentPackageId - The StudentPackage.id (course purchase)
   * @param courseProgramId - The CourseProgram.id
   */
  async seedProgressForCourse(
    studentPackageId: number,
    courseProgramId: number,
  ): Promise<StudentCourseStepProgress[]> {
    // Get all steps for this course
    const steps = await this.courseStepRepo.find({
      where: { courseProgramId },
      order: { stepOrder: "ASC" },
    });

    if (steps.length === 0) {
      throw new NotFoundException(
        `No steps found for course program ${courseProgramId}`,
      );
    }

    // Create progress records for all steps
    const progressRecords = steps.map((step) => {
      const progress = new StudentCourseStepProgress();
      progress.studentPackageId = studentPackageId;
      progress.courseStepId = step.id;
      progress.status = "UNBOOKED";
      return progress;
    });

    return this.progressRepo.save(progressRecords);
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
}
