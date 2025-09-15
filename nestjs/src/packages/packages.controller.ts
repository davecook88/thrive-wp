import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  ParseIntPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { Request } from 'express';
import { PackagesService } from './packages.service.js';

const UsePackageSchema = z.object({
  sessionId: z.number(),
});

type UsePackageDto = z.infer<typeof UsePackageSchema>;

interface AuthenticatedRequest extends Request {
  headers: Request['headers'] & {
    'x-auth-user-id'?: string;
  };
}

@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

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
    return this.packagesService.getActivePackagesForStudent(
      parseInt(userId, 10),
    );
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
    const studentId = parseInt(userId, 10);
    return this.packagesService.usePackageForSession(
      studentId,
      packageId,
      body.sessionId,
      studentId,
    );
  }
}
