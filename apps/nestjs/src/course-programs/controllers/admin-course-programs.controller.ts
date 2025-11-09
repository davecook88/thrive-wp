import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../../auth/admin.guard.js";
import { CourseProgramsService } from "../services/course-programs.service.js";
import { CourseStepsService } from "../services/course-steps.service.js";
import { CohortsService } from "../services/cohorts.service.js";
import type {
  CreateCourseProgramDto,
  UpdateCourseProgramDto,
  CreateCourseStepDto,
  UpdateCourseStepDto,
  AttachStepOptionDto,
  PublishCourseDto,
  CreateCourseCohortDto,
  UpdateCourseCohortDto,
  AssignCohortSessionDto,
} from "@thrive/shared";

/**
 * Admin endpoints for managing course programs
 * Base path: /admin/course-programs
 */
@Controller("admin/course-programs")
@UseGuards(AdminGuard)
export class AdminCourseProgramsController {
  constructor(
    private readonly courseProgramsService: CourseProgramsService,
    private readonly courseStepsService: CourseStepsService,
    private readonly cohortsService: CohortsService,
  ) {}

  // ==================== COURSE PROGRAM CRUD ====================

  @Post()
  async create(@Body() dto: CreateCourseProgramDto) {
    return this.courseProgramsService.create(dto);
  }

  @Get()
  async findAll() {
    return this.courseProgramsService.findAllWithPricing(true); // Include inactive, with pricing data
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    const courseProgram = await this.courseProgramsService.findOneOrFail(
      id,
      true,
    ); // Include relations
    return this.courseProgramsService.enrichWithPricing(courseProgram);
  }

  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCourseProgramDto,
  ) {
    return this.courseProgramsService.update(id, dto);
  }

  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.courseProgramsService.remove(id);
    return { message: "Course program deleted successfully" };
  }

  // ==================== COURSE STEPS ====================

  @Post(":id/steps")
  async createStep(
    @Param("id", ParseIntPipe) courseProgramId: number,
    @Body() dto: CreateCourseStepDto,
  ) {
    // Ensure courseProgramId matches URL param
    return this.courseStepsService.create({ ...dto, courseProgramId });
  }

  @Put("steps/:stepId")
  async updateStep(
    @Param("stepId", ParseIntPipe) stepId: number,
    @Body() dto: UpdateCourseStepDto,
  ) {
    return this.courseStepsService.update(stepId, dto);
  }

  @Delete("steps/:stepId")
  async removeStep(@Param("stepId", ParseIntPipe) stepId: number) {
    await this.courseStepsService.remove(stepId);
    return { message: "Course step deleted successfully" };
  }

  // ==================== STEP OPTIONS ====================

  @Post("steps/:stepId/options")
  async attachOption(
    @Param("stepId", ParseIntPipe) courseStepId: number,
    @Body() dto: AttachStepOptionDto,
  ) {
    // Ensure courseStepId matches URL param
    return this.courseStepsService.attachOption({ ...dto, courseStepId });
  }

  @Delete("steps/options/:optionId")
  async detachOption(@Param("optionId", ParseIntPipe) optionId: number) {
    await this.courseStepsService.detachOption(optionId);
    return { message: "Step option detached successfully" };
  }

  @Get("steps/:stepId/options")
  async listOptions(@Param("stepId", ParseIntPipe) stepId: number) {
    const options = await this.courseStepsService.listOptions(stepId);

    // Transform to StepOptionDetailDto format
    return options.map((option) => ({
      id: option.id,
      groupClassId: option.groupClassId,
      groupClassName: option.groupClass.title,
      isActive: option.isActive,
      maxStudents: option.groupClass.capacityMax,
      availableSeats: option.groupClass.capacityMax,
      // Session info with times in UTC - client handles timezone conversion
      session: option.groupClass.session
        ? {
            id: option.groupClass.session.id,
            startAt: option.groupClass.session.startAt.toISOString(),
            endAt: option.groupClass.session.endAt.toISOString(),
          }
        : undefined,
    }));
  }

  // ==================== PUBLISHING ====================

  @Post(":id/publish")
  async publish(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: PublishCourseDto,
  ) {
    const { priceInCents, currency } = dto;
    return this.courseProgramsService.publishToStripe(
      id,
      priceInCents,
      currency,
    );
  }

  // ==================== COHORTS ====================

  @Get(":id/cohorts")
  async getCohorts(@Param("id", ParseIntPipe) courseProgramId: number) {
    return this.cohortsService.findByCourseProgram(courseProgramId);
  }

  @Post(":id/cohorts")
  async createCohort(
    @Param("id", ParseIntPipe) courseProgramId: number,
    @Body() dto: Omit<CreateCourseCohortDto, "courseProgramId">,
  ) {
    return this.cohortsService.create(courseProgramId, dto);
  }
}

/**
 * Admin endpoints for managing individual cohorts
 * Base path: /admin/cohorts
 */
@Controller("admin/cohorts")
@UseGuards(AdminGuard)
export class AdminCohortsController {
  constructor(private readonly cohortsService: CohortsService) {}

  @Get(":id")
  async getCohort(@Param("id", ParseIntPipe) cohortId: number) {
    return this.cohortsService.findOneDetail(cohortId);
  }

  @Put(":id")
  async updateCohort(
    @Param("id", ParseIntPipe) cohortId: number,
    @Body() dto: UpdateCourseCohortDto,
  ) {
    return this.cohortsService.update(cohortId, dto);
  }

  @Delete(":id")
  async deleteCohort(@Param("id", ParseIntPipe) cohortId: number) {
    await this.cohortsService.remove(cohortId);
    return { message: "Cohort deleted successfully" };
  }

  @Post(":id/sessions")
  async assignSession(
    @Param("id", ParseIntPipe) cohortId: number,
    @Body() dto: Omit<AssignCohortSessionDto, "cohortId">,
  ) {
    await this.cohortsService.assignSession({ ...dto, cohortId });
    return { message: "Session assigned successfully" };
  }

  @Delete(":id/sessions/:stepId/:optionId")
  async removeSession(
    @Param("id", ParseIntPipe) cohortId: number,
    @Param("stepId", ParseIntPipe) courseStepId: number,
    @Param("optionId", ParseIntPipe) courseStepOptionId: number,
  ) {
    await this.cohortsService.removeSession(
      cohortId,
      courseStepId,
      courseStepOptionId,
    );
    return { message: "Session removed successfully" };
  }
}
