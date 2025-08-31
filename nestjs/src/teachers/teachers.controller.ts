import { Controller, Get, Post, Put, Body, UseGuards, Request } from '@nestjs/common';
import { TeachersService } from './teachers.service.js';
import { TeacherGuard } from '../auth/teacher.guard.js';
import { UpdateAvailabilityDto, PreviewAvailabilityDto } from './dto/availability.dto.js';

@Controller('teachers/me/availability')
@UseGuards(TeacherGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  async getAvailability(@Request() req: any) {
    const teacherId = req.user.id;
    return this.teachersService.getTeacherAvailability(teacherId);
  }

  @Put()
  async updateAvailability(
    @Request() req: any,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    const teacherId = req.user.id;
    return this.teachersService.updateTeacherAvailability(teacherId, dto);
  }

  @Post('preview')
  async previewAvailability(
    @Request() req: any,
    @Body() dto: PreviewAvailabilityDto,
  ) {
    const teacherId = req.user.id;
    return this.teachersService.previewTeacherAvailability(teacherId, dto);
  }
}
