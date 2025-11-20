import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { StudentsService } from "./students.service.js";
import { UpcomingSessionsResponseSchema } from "@thrive/shared";
import { Student } from "./entities/student.entity.js";
import { StudentGuard } from "../auth/student.guard.js";
import type { Request as ExpressRequest } from "express";

type AuthenticatedRequest = ExpressRequest & {
  user: { id: number; email: string; roles: string[] };
};

import { StudentDashboardService } from "./services/student-dashboard.service.js";

@Controller("students")
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly studentDashboardService: StudentDashboardService,
  ) {}

  @Get()
  findAll(): Promise<Student[]> {
    return this.studentsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string): Promise<Student | null> {
    return this.studentsService.findOne(+id);
  }

  @Get("user/:userId")
  findByUserId(@Param("userId") userId: string): Promise<Student | null> {
    return this.studentsService.findByUserId(+userId);
  }

  @Get("me/sessions")
  @UseGuards(StudentGuard)
  async getMySessions(
    @Request() req: AuthenticatedRequest,
    @Query("start") startDate?: string,
    @Query("end") endDate?: string,
  ) {
    const userId = req.user.id;
    return this.studentsService.getStudentSessions(userId, startDate, endDate);
  }

  @Get("me/stats")
  @UseGuards(StudentGuard)
  async getMyStats(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.studentsService.getStudentStats(userId);
  }

  @Get("me/upcoming")
  @UseGuards(StudentGuard)
  async getMyUpcoming(
    @Request() req: AuthenticatedRequest,
    @Query("limit") limit?: string,
  ) {
    const userId = req.user.id;
    const limitNum = limit ? parseInt(limit, 10) : 5;
    const sessions = await this.studentsService.getUpcomingSessions(
      userId,
      limitNum,
    );

    // Validate outgoing shape with shared schema to ensure consistency
    try {
      return UpcomingSessionsResponseSchema.parse(sessions);
    } catch {
      // If validation fails, still return raw sessions
      return sessions;
    }
  }

  @Get("me/enrollments")
  @UseGuards(StudentGuard)
  async getMyEnrollments(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.studentsService.getStudentEnrollments(userId);
  }

  @Get("me/dashboard-summary")
  @UseGuards(StudentGuard)
  async getDashboardSummary(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.studentDashboardService.getDashboardSummary(userId);
  }
}
