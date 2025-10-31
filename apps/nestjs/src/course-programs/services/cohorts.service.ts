/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CourseCohort } from "../entities/course-cohort.entity.js";
import { CourseCohortSession } from "../entities/course-cohort-session.entity.js";
import { CourseProgram } from "../entities/course-program.entity.js";
import { CourseStep } from "../entities/course-step.entity.js";
import { CourseStepOption } from "../entities/course-step-option.entity.js";
import {
  CourseCohortDetailDto,
  CourseCohortListItemDto,
  CreateCourseCohortDto,
  UpdateCourseCohortDto,
  AssignCohortSessionDto,
} from "@thrive/shared";

@Injectable()
export class CohortsService {
  constructor(
    @InjectRepository(CourseCohort)
    private readonly cohortRepo: Repository<CourseCohort>,
    @InjectRepository(CourseCohortSession)
    private readonly cohortSessionRepo: Repository<CourseCohortSession>,
    @InjectRepository(CourseProgram)
    private readonly courseProgramRepo: Repository<CourseProgram>,
    @InjectRepository(CourseStep)
    private readonly courseStepRepo: Repository<CourseStep>,
    @InjectRepository(CourseStepOption)
    private readonly stepOptionRepo: Repository<CourseStepOption>,
  ) {}

  /**
   * Create a new cohort for a course program
   */
  async create(
    courseProgramId: number,
    input: Omit<CreateCourseCohortDto, "courseProgramId">,
  ): Promise<CourseCohortDetailDto> {
    // Verify course program exists
    const courseProgram = await this.courseProgramRepo.findOne({
      where: { id: courseProgramId },
    });

    if (!courseProgram) {
      throw new NotFoundException(
        `Course program with ID ${courseProgramId} not found`,
      );
    }

    // Check for duplicate cohort name within course
    const existingCohort = await this.cohortRepo.findOne({
      where: {
        courseProgramId,
        name: input.name,
      },
    });

    if (existingCohort) {
      throw new ConflictException(
        `Cohort with name "${input.name}" already exists for this course`,
      );
    }

    // Validate dates
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException("End date must be after start date");
    }

    // Create cohort
    const cohort = this.cohortRepo.create({
      courseProgramId,
      ...input,
    });

    const savedCohort = await this.cohortRepo.save(cohort);

    // Return detailed DTO
    return this.findOneDetail(savedCohort.id);
  }

  /**
   * Get all cohorts for a course program
   */
  async findByCourseProgram(
    courseProgramId: number,
  ): Promise<CourseCohortListItemDto[]> {
    const cohorts = await this.cohortRepo
      .createQueryBuilder("cohort")
      .leftJoinAndSelect("cohort.cohortSessions", "sessions")
      .where("cohort.courseProgramId = :courseProgramId", { courseProgramId })
      .orderBy("cohort.startDate", "ASC")
      .getMany();

    return cohorts.map((cohort) => ({
      id: cohort.id,
      courseProgramId: cohort.courseProgramId,
      name: cohort.name,
      description: cohort.description,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      timezone: cohort.timezone,
      maxEnrollment: cohort.maxEnrollment,
      currentEnrollment: cohort.currentEnrollment,
      enrollmentDeadline: cohort.enrollmentDeadline?.toISOString() || null,
      isActive: cohort.isActive,
      availableSpots: cohort.maxEnrollment - cohort.currentEnrollment,
      sessionCount: cohort.cohortSessions?.length || 0,
    }));
  }

  /**
   * Get detailed cohort information with all sessions
   */
  async findOneDetail(cohortId: number): Promise<CourseCohortDetailDto> {
    const cohort = await this.cohortRepo.findOne({
      where: { id: cohortId },
      relations: [
        "courseProgram",
        "cohortSessions",
        "cohortSessions.courseStep",
        "cohortSessions.courseStepOption",
        "cohortSessions.courseStepOption.groupClass",
        "cohortSessions.courseStepOption.groupClass.session", // Load the single session
      ],
    });

    if (!cohort) {
      throw new NotFoundException(`Cohort with ID ${cohortId} not found`);
    }

    // Map sessions with details
    const sessions: CourseCohortDetailDto["sessions"] =
      cohort.cohortSessions.map((cs) => {
        // Each GroupClass has exactly one session now
        const session = cs.courseStepOption.groupClass.session;

        return {
          id: cs.id,
          cohortId: cs.cohortId,
          courseStepId: cs.courseStepId,
          courseStepOptionId: cs.courseStepOptionId,
          stepLabel: cs.courseStep.label,
          stepTitle: cs.courseStep.title,
          stepOrder: cs.courseStep.stepOrder,
          groupClassName: cs.courseStepOption.groupClass.title,
          sessionDateTime: session?.startAt.toISOString() || "",
          durationMinutes: session
            ? Math.floor(
                (session.endAt.getTime() - session.startAt.getTime()) / 60000,
              )
            : 60,
        };
      });

    return {
      id: cohort.id,
      courseProgramId: cohort.courseProgramId,
      courseCode: cohort.courseProgram.code,
      courseTitle: cohort.courseProgram.title,
      name: cohort.name,
      description: cohort.description,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      timezone: cohort.timezone,
      maxEnrollment: cohort.maxEnrollment,
      currentEnrollment: cohort.currentEnrollment,
      enrollmentDeadline: cohort.enrollmentDeadline?.toISOString() || null,
      isActive: cohort.isActive,
      availableSpots: cohort.maxEnrollment - cohort.currentEnrollment,
      sessions,
    };
  }

  /**
   * Update an existing cohort
   */
  async update(
    cohortId: number,
    input: UpdateCourseCohortDto,
  ): Promise<CourseCohortDetailDto> {
    const cohort = await this.cohortRepo.findOne({
      where: { id: cohortId },
    });

    if (!cohort) {
      throw new NotFoundException(`Cohort with ID ${cohortId} not found`);
    }

    // Check for duplicate name if changing
    if (input.name && input.name !== cohort.name) {
      const existingCohort = await this.cohortRepo.findOne({
        where: {
          courseProgramId: cohort.courseProgramId,
          name: input.name,
        },
      });

      if (existingCohort) {
        throw new ConflictException(
          `Cohort with name "${input.name}" already exists for this course`,
        );
      }
    }

    // Validate dates if both are provided
    if (input.startDate && input.endDate) {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      if (endDate <= startDate) {
        throw new BadRequestException("End date must be after start date");
      }
    }

    // Update cohort
    Object.assign(cohort, input);
    await this.cohortRepo.save(cohort);

    return this.findOneDetail(cohortId);
  }

  /**
   * Delete a cohort
   */
  async remove(cohortId: number): Promise<void> {
    const cohort = await this.cohortRepo.findOne({
      where: { id: cohortId },
    });

    if (!cohort) {
      throw new NotFoundException(`Cohort with ID ${cohortId} not found`);
    }

    // Check if cohort has enrollments
    if (cohort.currentEnrollment > 0) {
      throw new BadRequestException(
        `Cannot delete cohort with ${cohort.currentEnrollment} enrolled students`,
      );
    }

    await this.cohortRepo.softRemove(cohort);
  }

  /**
   * Assign a session to a cohort step
   */
  async assignSession(input: AssignCohortSessionDto): Promise<void> {
    // Verify cohort exists
    const cohort = await this.cohortRepo.findOne({
      where: { id: input.cohortId },
    });

    if (!cohort) {
      throw new NotFoundException(`Cohort with ID ${input.cohortId} not found`);
    }

    // Verify step exists and belongs to the same course
    const step = await this.courseStepRepo.findOne({
      where: { id: input.courseStepId },
    });

    if (!step) {
      throw new NotFoundException(
        `Course step with ID ${input.courseStepId} not found`,
      );
    }

    if (step.courseProgramId !== cohort.courseProgramId) {
      throw new BadRequestException(
        "Step does not belong to the same course as the cohort",
      );
    }

    // Verify step option exists and belongs to the step
    const stepOption = await this.stepOptionRepo.findOne({
      where: { id: input.courseStepOptionId },
    });

    if (!stepOption) {
      throw new NotFoundException(
        `Course step option with ID ${input.courseStepOptionId} not found`,
      );
    }

    if (stepOption.courseStepId !== input.courseStepId) {
      throw new BadRequestException("Step option does not belong to this step");
    }

    // Check if this exact combination already exists
    const existing = await this.cohortSessionRepo.findOne({
      where: {
        cohortId: input.cohortId,
        courseStepId: input.courseStepId,
        courseStepOptionId: input.courseStepOptionId,
      },
    });

    if (existing) {
      throw new ConflictException(
        "This session option is already assigned to this cohort step",
      );
    }

    // Create new assignment (allowing multiple options per step)
    const cohortSession = this.cohortSessionRepo.create(input);
    await this.cohortSessionRepo.save(cohortSession);
  }

  /**
   * Remove a specific session option assignment from a cohort step
   */
  async removeSession(
    cohortId: number,
    courseStepId: number,
    courseStepOptionId: number,
  ): Promise<void> {
    const cohortSession = await this.cohortSessionRepo.findOne({
      where: {
        cohortId,
        courseStepId,
        courseStepOptionId,
      },
    });

    if (!cohortSession) {
      throw new NotFoundException(
        `No session assignment found for cohort ${cohortId}, step ${courseStepId}, and option ${courseStepOptionId}`,
      );
    }

    await this.cohortSessionRepo.softRemove(cohortSession);
  }
}
