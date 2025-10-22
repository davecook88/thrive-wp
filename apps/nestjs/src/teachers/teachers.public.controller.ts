import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from "@nestjs/common";
import { TeachersService } from "./teachers.service.js";
import { PreviewAvailabilityDto } from "./dto/availability.dto.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Teacher } from "./entities/teacher.entity.js";

import type { PublicTeacherDto } from "@thrive/shared";
@Controller("teachers")
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
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.user", "u")
      .where("t.is_active = 1")
      .orderBy("u.first_name", "ASC")
      .addOrderBy("u.last_name", "ASC")
      .getMany();

    return teachers.map((t) => t.toPublicDto());
  }

  @Get(":id")
  async getTeacher(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<PublicTeacherDto> {
    // Delegate to service to fetch public teacher profile
    const t: PublicTeacherDto =
      await this.teachersService.getPublicTeacherById(id);
    return t;
  }

  @Post("availability/preview")
  async previewAvailabilityForTeachers(@Body() dto: PreviewAvailabilityDto) {
    return this.teachersService.previewTeacherAvailability(dto.teacherIds, dto);
  }
}
