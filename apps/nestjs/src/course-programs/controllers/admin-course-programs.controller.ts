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
import type {
  CreateCourseProgramDto,
  UpdateCourseProgramDto,
  CreateCourseStepDto,
  UpdateCourseStepDto,
  AttachStepOptionDto,
  PublishCourseDto,
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
    return this.courseStepsService.listOptions(stepId);
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
}
