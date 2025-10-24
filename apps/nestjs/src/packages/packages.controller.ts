import {
  Controller,
  Get,
  Param,
  Req,
  Query,
  ParseIntPipe,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import { ServiceType } from "@thrive/shared";
import { PackagesService } from "./packages.service.js";
import { StudentsService } from "../students/students.service.js";

interface AuthenticatedRequest extends Request {
  headers: Request["headers"] & {
    "x-auth-user-id"?: string;
  };
}

@Controller("packages")
export class PackagesController {
  constructor(
    private readonly packagesService: PackagesService,
    private readonly studentsService: StudentsService,
  ) {}

  @Get()
  async getAvailablePackages(
    @Query("sessionId") sessionId?: string,
    @Query("serviceType") serviceType?: ServiceType,
  ) {
    // If sessionId provided, return packages compatible with that session
    if (sessionId) {
      const sessionIdNum = parseInt(sessionId, 10);
      if (!Number.isFinite(sessionIdNum)) {
        throw new BadRequestException("sessionId must be a valid number");
      }
      return this.packagesService.getValidPackagesForSession(sessionIdNum);
    }

    if (serviceType) {
      return this.packagesService.getPackagesByServiceType(serviceType);
    }

    // Return all available packages
    return this.packagesService.getActivePackages();
  }

  @Get("my-credits")
  async myCredits(@Req() req: AuthenticatedRequest) {
    const userId = req.headers["x-auth-user-id"];
    if (!userId) {
      throw new UnauthorizedException("User ID not found in auth headers");
    }

    // Convert user ID to student ID
    const student = await this.studentsService.findByUserId(
      parseInt(userId, 10),
    );
    if (!student) {
      throw new NotFoundException("Student record not found for this user");
    }

    return this.packagesService.getActivePackagesForStudent(student.id);
  }

  @Get("compatible-for-session/:sessionId")
  async getCompatiblePackagesForSession(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.headers["x-auth-user-id"];
    if (!userId) {
      throw new UnauthorizedException("User ID not found in auth headers");
    }

    // Convert user ID to student ID
    const student = await this.studentsService.findByUserId(
      parseInt(userId, 10),
    );
    if (!student) {
      throw new NotFoundException("Student record not found for this user");
    }

    return this.packagesService.getCompatiblePackagesForSession(
      student.id,
      sessionId,
    );
  }
}
