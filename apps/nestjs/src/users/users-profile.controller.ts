import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import { UsersService } from "./users.service.js";
import { AuthenticatedGuard } from "../auth/authenticated.guard.js";
import {
  UpdateUserProfileSchema,
  type UpdateUserProfileDto,
} from "@thrive/shared";
import type { Request as ExpressRequest } from "express";

type AuthenticatedRequest = ExpressRequest & {
  user: { id: number; email: string; roles: string[] };
};

@Controller("users/me")
@UseGuards(AuthenticatedGuard)
export class UsersProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getMyProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.usersService.findById(userId);
  }

  @Patch()
  async updateMyProfile(
    @Request() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UpdateUserProfileSchema))
    dto: UpdateUserProfileDto,
  ) {
    const userId = req.user.id;
    return this.usersService.updateProfile(userId, dto);
  }
}
