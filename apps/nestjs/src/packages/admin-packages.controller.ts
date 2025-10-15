import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import { AdminGuard } from "../auth/admin.guard.js";
import { PackagesService } from "./packages.service.js";
import { CreatePackageSchema } from "@thrive/shared";
import type { CreatePackageDto } from "@thrive/shared";

@Controller("admin/packages")
@UseGuards(AdminGuard)
export class AdminPackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  async createPackage(
    @Body(new ZodValidationPipe(CreatePackageSchema)) dto: CreatePackageDto,
  ) {
    return this.packagesService.createPackage(dto);
  }

  @Get()
  async listPackages() {
    return this.packagesService.getPackages();
  }

  @Get(":id")
  async getPackage(@Param("id", ParseIntPipe) id: number) {
    return this.packagesService.getPackage(id);
  }

  @Post(":id/deactivate")
  async deactivatePackage(@Param("id", ParseIntPipe) id: number) {
    await this.packagesService.deactivatePackage(id);
    return { success: true };
  }
}
