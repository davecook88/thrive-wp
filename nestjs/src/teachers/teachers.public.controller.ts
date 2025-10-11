import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { TeachersService } from './teachers.service.js';
import { PreviewAvailabilityDto } from './dto/availability.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher, TeacherLocation } from './entities/teacher.entity.js';

interface PublicTeacherDto {
  userId: number;
  teacherId: number;
  firstName: string;
  lastName: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  birthplace: TeacherLocation | null;
  currentLocation: TeacherLocation | null;
  specialties: string[] | null;
  yearsExperience: number | null;
  languagesSpoken: string[] | null;
}

@Controller('teachers')
export class TeachersPublicController {
  constructor(
    private readonly teachersService: TeachersService,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
  ) {}

  @Get()
  async listTeachers(): Promise<PublicTeacherDto[]> {
    // Return active teachers with basic profile information
    const teachers = await this.teacherRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'u')
      .where('t.is_active = 1')
      .orderBy('u.first_name', 'ASC')
      .addOrderBy('u.last_name', 'ASC')
      .getMany();

    return teachers.map((t) => ({
      userId: t.userId,
      teacherId: t.id,
      firstName: t.user?.firstName ?? '',
      lastName: t.user?.lastName ?? '',
      name:
        [
          (t.user?.firstName ?? '').trim(),
          (t.user?.lastName ?? '').trim(),
        ]
          .filter(Boolean)
          .join(' ') || 'Teacher',
      bio: t.bio ?? null,
      avatarUrl: t.avatarUrl ?? null,
      birthplace: t.birthplace ?? null,
      currentLocation: t.currentLocation ?? null,
      specialties: t.specialties ?? null,
      yearsExperience: t.yearsExperience ?? null,
      languagesSpoken: t.languagesSpoken ?? null,
    }));
  }

  @Get(':id')
  async getTeacher(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PublicTeacherDto> {
    // Delegate to service to fetch public teacher profile
    const t = await this.teachersService.getPublicTeacherById(id);
    return t;
  }

  @Post('availability/preview')
  async previewAvailabilityForTeachers(@Body() dto: PreviewAvailabilityDto) {
    return this.teachersService.previewTeacherAvailability(dto.teacherIds, dto);
  }
}
