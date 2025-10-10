import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  ParseIntPipe,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { Request } from 'express';
import { PackagesService } from './packages.service.js';
import { StudentsService } from '../students/students.service.js';

const BookingDataSchema = z.object({
  teacherId: z.number(),
  startAt: z.string(),
  endAt: z.string(),
});

const UsePackageSchema = z.object({
  sessionId: z.number().optional(),
  bookingData: BookingDataSchema.optional(),
}).refine(
  (data) => data.sessionId !== undefined || data.bookingData !== undefined,
  { message: 'Either sessionId or bookingData must be provided' }
);

type UsePackageDto = z.infer<typeof UsePackageSchema>;

interface AuthenticatedRequest extends Request {
  headers: Request['headers'] & {
    'x-auth-user-id'?: string;
  };
}

@Controller('packages')
export class PackagesController {
  constructor(
    private readonly packagesService: PackagesService,
    private readonly studentsService: StudentsService,
  ) {}

  @Get()
  async getAvailablePackages() {
    // Return available packages that can be purchased from the catalog
    return this.packagesService.getActivePackages();
  }

  @Get('my-credits')
  async myCredits(@Req() req: AuthenticatedRequest) {
    const userId = req.headers['x-auth-user-id'];
    if (!userId) {
      throw new UnauthorizedException('User ID not found in auth headers');
    }

    // Convert user ID to student ID
    const student = await this.studentsService.findByUserId(
      parseInt(userId, 10),
    );
    if (!student) {
      throw new NotFoundException('Student record not found for this user');
    }

    return this.packagesService.getActivePackagesForStudent(student.id);
  }

  @Post(':id/use')
  async usePackage(
    @Param('id', ParseIntPipe) packageId: number,
    @Body(new ZodValidationPipe(UsePackageSchema)) body: UsePackageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.headers['x-auth-user-id'];
    if (!userId) {
      throw new UnauthorizedException('User ID not found in auth headers');
    }
    const userIdNum = parseInt(userId, 10);

    // If sessionId provided, use existing session flow
    if (body.sessionId !== undefined) {
      return this.packagesService.usePackageForSession(
        userIdNum,
        packageId,
        body.sessionId,
        userIdNum,
      );
    }

    // Otherwise, create session from booking data and book it
    if (body.bookingData) {
      return this.packagesService.createAndBookSession(
        userIdNum,
        packageId,
        body.bookingData,
      );
    }

    throw new BadRequestException('Either sessionId or bookingData must be provided');
  }
}
