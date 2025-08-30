import { Controller, Get, Param } from '@nestjs/common';
import { StudentsService } from './students.service.js';
import { Student } from './entities/student.entity.js';

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
}
