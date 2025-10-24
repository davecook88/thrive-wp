import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { CourseProgramsService } from "../services/course-programs.service.js";

/**
 * Public endpoints for course programs
 * Base path: /course-programs
 *
 * Simplified architecture:
 * - Enrollments are now tracked via StudentPackage (use /packages/my-credits)
 * - Course purchases handled by existing Stripe webhook → StudentPackage flow
 */
@Controller("course-programs")
export class CourseProgramsController {
  constructor(private readonly courseProgramsService: CourseProgramsService) {}

  /**
   * List all active course programs
   */
  @Get()
  async findAll() {
    return this.courseProgramsService.findAll(false); // Only active
  }

  /**
   * Get course program detail
   */
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.courseProgramsService.findOneOrFail(id, true); // Include relations
  }
}
