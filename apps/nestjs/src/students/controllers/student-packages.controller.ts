import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from "@nestjs/common";
import { StudentGuard } from "../../auth/student.guard.js";
import { CourseStepProgressService } from "../../course-programs/services/course-step-progress.service.js";

@Controller("students/me/course-packages")
@UseGuards(StudentGuard)
export class StudentPackagesController {
  constructor(
    private readonly courseStepProgressService: CourseStepProgressService,
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
   * POST /students/me/course-packages/:packageId/book-sessions
   * Book sessions for a course package (auto-book + manual selections)
   */
  @Post(":packageId/book-sessions")
  async bookSessions(
    @Param("packageId", ParseIntPipe) packageId: number,
    @Body() body: { selections: { courseStepId: number; courseStepOptionId: number }[] },
    @Req() req: { user: { id: number; studentId: number } },
  ) {
    // TODO: Verify package ownership
    return this.courseStepProgressService.bookSessions(
      packageId,
      body.selections || [],
    );
  }
}
