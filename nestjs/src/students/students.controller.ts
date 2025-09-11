import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { StudentsService, CalendarEvent } from './students.service.js';
import { Student } from './entities/student.entity.js';
import { StudentGuard } from '../auth/student.guard.js';
import type { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & {
  user: { id: number; email: string; roles: string[] };
};

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll(): Promise<Student[]> {
    return this.studentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Student | null> {
    return this.studentsService.findOne(+id);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string): Promise<Student | null> {
    return this.studentsService.findByUserId(+userId);
  }

  @Get('me/sessions')
  @UseGuards(StudentGuard)
  async getMySessions(
    @Request() req: AuthenticatedRequest,
    @Query('start') startDate?: string,
    @Query('end') endDate?: string,
  ) {
    const userId = req.user.id;
    return this.studentsService.getStudentSessions(userId, startDate, endDate);
  }
}
