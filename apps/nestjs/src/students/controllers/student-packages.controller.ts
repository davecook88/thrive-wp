import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from "@nestjs/common";
import { StudentGuard } from "../../auth/student.guard.js";
import { CourseStepProgressService } from "../../course-programs/services/course-step-progress.service.js";
import { CourseStepBookingService } from "../../course-programs/services/course-step-booking.service.js";
import {
  BookStepSessionDto,
  ChangeStepSessionDto,
  CancelStepBookingDto,
  BulkBookSessionsDto,
} from "../../course-programs/dto/book-step-session.dto.js";
import { StudentsService } from "../students.service.js";
import { NotFoundException } from "@nestjs/common";

@Controller("students/me/course-packages")
@UseGuards(StudentGuard)
export class StudentPackagesController {
  constructor(
    private readonly courseStepProgressService: CourseStepProgressService,
    private readonly courseStepBookingService: CourseStepBookingService,
    private readonly studentsService: StudentsService,
  ) {}

  private async getStudentId(userId: number): Promise<number> {
    const student = await this.studentsService.findByUserId(userId);
    if (!student) {
      throw new NotFoundException("Student profile not found");
    }
    return student.id;
  }

  /**
   * GET /students/me/course-packages
   * Get all course packages for the current student
   */
  @Get()
  async getStudentPackages(@Req() req: { user: { id: number } }) {
    const studentId = await this.getStudentId(req.user.id);
    return this.courseStepProgressService.getStudentPackages(studentId);
  }

  /**
   * GET /students/me/course-packages/:packageId
   * Get detailed view of a single course package
   */
  @Get(":packageId")
  async getPackageDetail(
    @Param("packageId", ParseIntPipe) packageId: number,
    @Req() req: { user: { id: number } },
  ) {
    const studentId = await this.getStudentId(req.user.id);
    return this.courseStepProgressService.getPackageDetail(
      studentId,
      packageId,
    );
  }

  /**
   * GET /students/me/course-packages/:packageId/unbooked-steps
   * Get steps that need manual session selection
   */
  @Get(":packageId/unbooked-steps")
  async getUnbookedSteps(
    @Param("packageId", ParseIntPipe) packageId: number,
    @Req() req: { user: { id: number } },
  ) {
    await this.getStudentId(req.user.id); // Ensure student exists
    // TODO: Verify package ownership using studentId
    return this.courseStepProgressService.getUnbookedSteps(packageId);
  }

  /**
   * POST /students/me/course-packages/:packageId/steps/:stepId/book-session
   * Book a single course step session
   */
  @Post(":packageId/steps/:stepId/book-session")
  async bookStepSession(
    @Param("packageId", ParseIntPipe) packageId: number,
    @Param("stepId", ParseIntPipe) stepId: number,
    @Body() dto: BookStepSessionDto,
    @Req() req: { user: { id: number } },
  ) {
    const studentId = await this.getStudentId(req.user.id);
    return this.courseStepBookingService.bookStepSession(
      studentId,
      packageId,
      stepId,
      dto.courseStepOptionId,
    );
  }

  /**
   * POST /students/me/course-packages/:packageId/steps/:stepId/change-session
   * Change an existing course step session booking
   */
  @Post(":packageId/steps/:stepId/change-session")
  async changeStepSession(
    @Param("packageId", ParseIntPipe) packageId: number,
    @Param("stepId", ParseIntPipe) stepId: number,
    @Body() dto: ChangeStepSessionDto,
    @Req() req: { user: { id: number } },
  ) {
    const studentId = await this.getStudentId(req.user.id);
    return this.courseStepBookingService.changeStepSession(
      studentId,
      packageId,
      stepId,
      dto.courseStepOptionId,
    );
  }

  /**
   * POST /students/me/course-packages/:packageId/book-sessions
   * Bulk book sessions for a course package (auto-book + manual selections)
   * Used after purchase in the session selection wizard
   */
  @Post(":packageId/book-sessions")
  async bulkBookStepSessions(
    @Param("packageId", ParseIntPipe) packageId: number,
    @Body() dto: BulkBookSessionsDto,
    @Req() req: { user: { id: number } },
  ) {
    const studentId = await this.getStudentId(req.user.id);
    return this.courseStepBookingService.bulkBookStepSessions(
      studentId,
      packageId,
      dto.selections || [],
    );
  }

  /**
   * DELETE /students/me/course-packages/:packageId/steps/:stepId/booking
   * Cancel a course step booking
   */
  @Delete(":packageId/steps/:stepId/booking")
  async cancelStepBooking(
    @Param("packageId", ParseIntPipe) packageId: number,
    @Param("stepId", ParseIntPipe) stepId: number,
    @Body() dto: CancelStepBookingDto,
    @Req() req: { user: { id: number } },
  ) {
    const studentId = await this.getStudentId(req.user.id);
    return this.courseStepBookingService.cancelStepBooking(
      studentId,
      packageId,
      stepId,
      dto.reason,
    );
  }
}
