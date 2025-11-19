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

@Controller("students/me/course-packages")
@UseGuards(StudentGuard)
export class StudentPackagesController {
  constructor(
    private readonly courseStepProgressService: CourseStepProgressService,
    private readonly courseStepBookingService: CourseStepBookingService,
  ) {}

  /**
   * GET /students/me/course-packages/:packageId/unbooked-steps
   * Get steps that need manual session selection
   */
  @Get(":packageId/unbooked-steps")
  async getUnbookedSteps(
    @Param("packageId", ParseIntPipe) packageId: number,
    @Req() req: { user: { id: number; studentId: number } },
  ) {
    // TODO: Verify package ownership
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
    @Req() req: { user: { id: number; studentId: number } },
  ) {
    return this.courseStepBookingService.bookStepSession(
      req.user.studentId,
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
    @Req() req: { user: { id: number; studentId: number } },
  ) {
    return this.courseStepBookingService.changeStepSession(
      req.user.studentId,
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
    @Req() req: { user: { id: number; studentId: number } },
  ) {
    return this.courseStepBookingService.bulkBookStepSessions(
      req.user.studentId,
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
    @Req() req: { user: { id: number; studentId: number } },
  ) {
    await this.courseStepBookingService.cancelStepBooking(
      req.user.studentId,
      packageId,
      stepId,
      dto.reason,
    );
    return { success: true };
  }
}
