import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { TeachersService } from "./teachers.service.js";
import { TeacherGuard } from "../auth/teacher.guard.js";
import { UpdateTeacherProfileDto } from "./dto/update-teacher-profile.dto.js";
import type { Request as ExpressRequest } from "express";

type AuthenticatedRequest = ExpressRequest & {
  user: { id: number; email: string; roles: string[] };
};

@Controller("teachers/me/profile")
@UseGuards(TeacherGuard)
export class TeachersProfileController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  async getMyProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.teachersService.getMyProfile(userId);
  }

  @Patch()
  async updateMyProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateTeacherProfileDto,
  ) {
    const userId = req.user.id;
    return this.teachersService.updateMyProfile(userId, dto);
  }
}
