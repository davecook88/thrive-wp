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
import { Teacher, TeacherLocation } from "./entities/teacher.entity.js";

import type { PublicTeacherDto } from "../../../shared/types/teachers.js";
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

    return teachers.map((t) => ({
      userId: t.userId,
      id: t.id,
      displayName:
        [(t.user?.firstName ?? "").trim(), (t.user?.lastName ?? "").trim()]
          .filter(Boolean)
          .join(" ") || "Teacher",
      bio: t.bio ?? null,
      avatarUrl: t.avatarUrl ?? null,
      birthplace: t.birthplace ?? null,
      currentLocation: t.currentLocation ?? null,
      specialties: t.specialties ?? undefined,
      yearsExperience: t.yearsExperience ?? null,
      languagesSpoken: t.languagesSpoken ?? undefined,
      initials: [t.user?.firstName?.charAt(0), t.user?.lastName?.charAt(0)]
        .filter(Boolean)
        .join("")
        .toUpperCase(),
      // The following fields are not available in this query, set to undefined
      languages: t.languagesSpoken ?? undefined,
      isActive: t.isActive,
    }));
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
