import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { TeachersService } from "./teachers.service.js";
import { TeacherGuard } from "../auth/teacher.guard.js";
import {
  UpdateAvailabilityDto,
  PreviewMyAvailabilityDto,
} from "./dto/availability.dto.js";
import type { Request as ExpressRequest } from "express";
import type {
  GetAvailabilityResponse,
  PreviewAvailabilityResponse,
} from "@thrive/shared";

type AuthenticatedRequest = ExpressRequest & {
  user: { id: number; email: string; roles: string[] };
};

// response types are imported from shared types

@Controller("teachers/me/availability")
@UseGuards(TeacherGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  async getAvailability(
    @Request() req: AuthenticatedRequest,
  ): Promise<GetAvailabilityResponse> {
    const teacherId = req.user.id;
    return await this.teachersService.getTeacherAvailability(teacherId);
  }

  @Put()
  async updateAvailability(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateAvailabilityDto,
  ): Promise<GetAvailabilityResponse> {
    const teacherId = req.user.id;
    return await this.teachersService.updateTeacherAvailability(teacherId, dto);
  }

  @Post("preview")
  async previewAvailability(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PreviewMyAvailabilityDto,
  ): Promise<PreviewAvailabilityResponse> {
    const userId = req.user.id;
    const teacherId = await this.teachersService.getTeacherIdByUserId(userId);
    return await this.teachersService.previewTeacherAvailability(
      [teacherId],
      dto,
    );
  }
}

@Controller("teachers/me")
@UseGuards(TeacherGuard)
export class TeachersStatsController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get("stats")
  async getMyStats(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return await this.teachersService.getTeacherStats(userId);
  }

  @Get("sessions")
  async getMySessions(
    @Request() req: AuthenticatedRequest,
    @Query("start") startDate?: string,
    @Query("end") endDate?: string,
  ) {
    const userId = req.user.id;
    return this.teachersService.getTeacherSessions(userId, startDate, endDate);
  }
}
