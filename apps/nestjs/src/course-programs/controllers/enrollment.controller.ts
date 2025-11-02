import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from "@nestjs/common";
import { StudentGuard } from "../../auth/student.guard.js";
import { CourseEnrollmentService } from "../services/course-enrollment.service.js";
import { Student } from "../../students/entities/student.entity.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { EnrollInCohortDto } from "@thrive/shared";

@Controller("course-programs")
export class EnrollmentController {
  constructor(
    private readonly enrollmentService: CourseEnrollmentService,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  /**
   * POST /course-programs/:code/cohorts/:cohortId/enroll
   * Create Stripe checkout session for course cohort enrollment
   */
  @Post(":code/cohorts/:cohortId/enroll")
  @UseGuards(StudentGuard)
  async enrollInCohort(
    @Param("code") code: string,
    @Param("cohortId", ParseIntPipe) cohortId: number,
    @Body() dto: EnrollInCohortDto,
    @Req() req: { user: { id: number } },
  ) {
    // Get student from userId
    const student = await this.studentRepo.findOne({
      where: { userId: req.user.id },
    });
    if (!student) throw new Error("Student not found");

    return this.enrollmentService.createCheckoutSession(
      student.id,
      code,
      cohortId,
      dto,
    );
  }

  /**
   * GET /course-programs/enrollment/session/:sessionId
   * Get enrollment info from Stripe session (for post-purchase wizard)
   */
  @Get("enrollment/session/:sessionId")
  @UseGuards(StudentGuard)
  async getEnrollmentSession(
    @Param("sessionId") sessionId: string,
    @Req() req: { user: { id: number } },
  ) {
    // Get student from userId
    const student = await this.studentRepo.findOne({
      where: { userId: req.user.id },
    });
    if (!student) throw new Error("Student not found");

    return this.enrollmentService.getEnrollmentSessionInfo(sessionId, student.id);
  }
}
