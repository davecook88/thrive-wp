import {
  Controller,
  Get,
  Post,
  Body,
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
import { ZodValidationPipe } from "nestjs-zod";
import { z } from "zod";
import { PackagesService } from "./packages.service.js";
import { StudentsService } from "../students/students.service.js";

// Local schema for POST /packages/:id/use
const UsePackagePayloadSchema = z.object({
  bookingData: z.object({
    teacherId: z.number().int().positive(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
  }),
  allowanceId: z.number().int().positive(),
});

type UsePackagePayloadDto = z.infer<typeof UsePackagePayloadSchema>;

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

    console.log("studentId", student.id);
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

  @Get("compatible-for-booking")
  async getCompatiblePackagesForBooking(
    @Query("serviceType") serviceType: ServiceType,
    @Query("teacherTier", ParseIntPipe) teacherTier: number,
    @Req() req: AuthenticatedRequest,
  ) {
    // Validate required query params
    if (!serviceType) {
      throw new BadRequestException("serviceType is required");
    }
    if (!Number.isFinite(teacherTier)) {
      throw new BadRequestException("teacherTier must be a valid number");
    }

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

    return this.packagesService.getCompatiblePackagesForBooking(
      student.id,
      serviceType,
      teacherTier,
    );
  }

  @Post(":id/use")
  async usePackage(
    @Param("id", ParseIntPipe) packageId: number,
    @Body(new ZodValidationPipe(UsePackagePayloadSchema))
    body: UsePackagePayloadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.headers["x-auth-user-id"];
    if (!userId) {
      throw new UnauthorizedException("User ID not found in auth headers");
    }

    return this.packagesService.createAndBookSession(
      parseInt(userId, 10),
      packageId,
      body.bookingData,
      body.allowanceId,
    );
  }
}
