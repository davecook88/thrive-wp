import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Inject,
  HttpCode,
} from "@nestjs/common";
import { CourseMaterialsService } from "./course-materials.service.js";
import { CreateCourseStepMaterialDto } from "./dto/create-course-step-material.dto.js";
import { UpdateCourseStepMaterialDto } from "./dto/update-course-step-material.dto.js";
import { SubmitAnswerDto } from "./dto/submit-answer.dto.js";
import { UpdateProgressDto } from "./dto/update-progress.dto.js";
import { AssessAnswerDto } from "./dto/assess-answer.dto.js";
import { AdminGuard } from "../auth/admin.guard.js";
import { StudentGuard } from "../auth/student.guard.js";
import { TeacherGuard } from "../auth/teacher.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { User } from "../users/entities/user.entity.js";
import { ZodValidationPipe } from "nestjs-zod";

@Controller("course-materials")
export class CourseMaterialsController {
  constructor(
    @Inject(CourseMaterialsService)
    private readonly courseMaterialsService: CourseMaterialsService,
  ) {
    console.log("CourseMaterialsController initialized", {
      service: !!this.courseMaterialsService,
    });
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(
    @Body(new ZodValidationPipe(CreateCourseStepMaterialDto))
    dto: CreateCourseStepMaterialDto,
    @CurrentUser() user: User,
  ) {
    return await this.courseMaterialsService.create(dto, user.id);
  }

  @Get("step/:stepId")
  findAll(@Param("stepId", ParseIntPipe) stepId: number) {
    return this.courseMaterialsService.findAll(stepId);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.courseMaterialsService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateCourseStepMaterialDto))
    dto: UpdateCourseStepMaterialDto,
  ) {
    return this.courseMaterialsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.courseMaterialsService.remove(id);
  }

  // Student Endpoints
  @Post("progress")
  @HttpCode(201)
  @UseGuards(StudentGuard)
  async updateProgress(
    @Body(new ZodValidationPipe(UpdateProgressDto))
    dto: UpdateProgressDto,
    @CurrentUser() user: User,
  ) {
    return this.courseMaterialsService.updateProgress(
      user.id,
      dto.courseStepMaterialId,
      dto.studentPackageId,
      dto.status,
    );
  }

  @Get("progress/:courseStepId")
  @UseGuards(StudentGuard)
  getProgress(
    @Param("courseStepId", ParseIntPipe) courseStepId: number,
    @CurrentUser() user: User,
  ) {
    return this.courseMaterialsService.getProgress(user.id, courseStepId);
  }

  @Post("answers/submit")
  @HttpCode(201)
  @UseGuards(StudentGuard)
  async submitAnswer(
    @Body(new ZodValidationPipe(SubmitAnswerDto))
    dto: SubmitAnswerDto,
    @CurrentUser() user: User,
  ) {
    return this.courseMaterialsService.submitAnswer(
      dto.questionId,
      user.id,
      dto.answerContent,
    );
  }

  @Get("my-answers")
  @UseGuards(StudentGuard)
  getMyAnswers(@CurrentUser() user: User) {
    return this.courseMaterialsService.getStudentAnswers(user.id);
  }

  @Get("step/:stepId/enrollment")
  @UseGuards(StudentGuard)
  getEnrollmentForStep(
    @Param("stepId", ParseIntPipe) stepId: number,
    @CurrentUser() user: User,
  ) {
    return this.courseMaterialsService.getEnrollmentForStep(user.id, stepId);
  }

  // Teacher Endpoints
  @Get("assessment/queue")
  @UseGuards(TeacherGuard)
  getAssessmentQueue() {
    return this.courseMaterialsService.getAssessmentQueue();
  }

  @Post("assessment/answers/:answerId")
  @HttpCode(201)
  @UseGuards(TeacherGuard)
  async assessAnswer(
    @Param("answerId", ParseIntPipe) answerId: number,
    @Body(new ZodValidationPipe(AssessAnswerDto))
    dto: AssessAnswerDto,
    @CurrentUser() user: User,
  ) {
    return this.courseMaterialsService.assessAnswer(
      answerId,
      dto.status,
      dto.feedback,
      user.id,
    );
  }
}
