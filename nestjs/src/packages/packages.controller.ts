import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { AdminGuard } from '../auth/admin.guard.js';
import { PackagesService } from './packages.service.js';
import { CreatePackageSchema } from './dto/create-package.dto.js';
import type { CreatePackageDto } from './dto/create-package.dto.js';
import type { PackageResponseDto } from './dto/package-response.dto.js';

@Controller('admin/packages')
@UseGuards(AdminGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  async createPackage(
    @Body(new ZodValidationPipe(CreatePackageSchema)) createPackageDto: CreatePackageDto,
  ): Promise<PackageResponseDto> {
    return this.packagesService.createPackage(createPackageDto);
  }

  @Get()
  async getPackages(): Promise<PackageResponseDto[]> {
    return this.packagesService.getPackages();
  }

  @Get(':id')
  async getPackage(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PackageResponseDto> {
    return this.packagesService.getPackage(id);
  }

  @Post(':id/deactivate')
  async deactivatePackage(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.packagesService.deactivatePackage(id);
    return { message: 'Package deactivated successfully' };
  }
}