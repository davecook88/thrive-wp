import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TeachersService } from './teachers.service.js';
import { TeacherGuard } from '../auth/teacher.guard.js';
import {
  UpdateAvailabilityDto,
  PreviewAvailabilityDto,
} from './dto/availability.dto.js';
import type { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & {
  user: { id: number; email: string; roles: string[] };
};

interface GetAvailabilityResponse {
  rules: Array<{
    id: number;
    weekday: number;
    startTime: string;
    endTime: string;
  }>;
  exceptions: Array<{
    id: number;
    date: string;
    startTime?: string;
    endTime?: string;
    isBlackout: boolean;
  }>;
}

interface PreviewAvailabilityResponse {
  windows: Array<{ start: string; end: string }>;
}

@Controller('teachers/me/availability')
@UseGuards(TeacherGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  async getAvailability(
    @Request() req: AuthenticatedRequest,
  ): Promise<GetAvailabilityResponse> {
    const teacherId = req.user.id;
    return this.teachersService.getTeacherAvailability(teacherId);
  }

  @Put()
  async updateAvailability(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateAvailabilityDto,
  ): Promise<GetAvailabilityResponse> {
    const teacherId = req.user.id;
    return this.teachersService.updateTeacherAvailability(teacherId, dto);
  }

  @Post('preview')
  async previewAvailability(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PreviewAvailabilityDto,
  ): Promise<PreviewAvailabilityResponse> {
    const teacherId = req.user.id;
    return this.teachersService.previewTeacherAvailability(teacherId, dto);
  }
}
