import { Controller, Get, Post, Body } from '@nestjs/common';
import { TeachersService } from './teachers.service.js';
import { PreviewAvailabilityDto } from './dto/availability.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from './entities/teacher.entity.js';

interface PublicTeacherDto {
  userId: number;
  teacherId: number;
  firstName: string;
  lastName: string;
  name: string;
  bio: string | null;
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
      firstName: (t.user as any)?.firstName ?? '',
      lastName: (t.user as any)?.lastName ?? '',
      name:
        [
          ((t.user as any)?.firstName ?? '').trim(),
          ((t.user as any)?.lastName ?? '').trim(),
        ]
          .filter(Boolean)
          .join(' ') || 'Teacher',
      bio: t.bio ?? null,
    }));
  }

  @Post('availability/preview')
  async previewAvailabilityForTeachers(@Body() dto: PreviewAvailabilityDto) {
    return this.teachersService.previewTeacherAvailability(dto.teacherIds, dto);
  }
}
