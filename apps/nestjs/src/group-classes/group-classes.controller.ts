import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import { GroupClassesService } from "./group-classes.service.js";
import { GroupClass } from "./entities/group-class.entity.js";
import { Session } from "../sessions/entities/session.entity.js";
import { AdminGuard } from "../auth/admin.guard.js";
import {
  CreateGroupClassSchema,
  type CreateGroupClassDto,
} from "./dto/create-group-class.dto.js";
import { GroupClassListDto } from "./dto/group-class-list.dto.js";

@Controller("group-classes")
export class GroupClassesController {
  constructor(private readonly groupClassesService: GroupClassesService) {}

  @Get()
  async findAll(): Promise<GroupClassListDto[]> {
    return this.groupClassesService.findAll();
  }

  @Get("available")
  getAvailableSessions(
    @Query()
    filters: {
      levelId?: number;
      teacherId?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    try {
      return this.groupClassesService.getAvailableSessions(filters);
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : "",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<GroupClassListDto | null> {
    return await this.groupClassesService.findOne(+id);
  }

  @Post(":id/generate-sessions")
  generateSessions(@Param("id") id: string): Promise<Session[]> {
    return this.groupClassesService.generateSessions(+id);
  }

  /**
   * Create a new Group Class (Admin)
   */
  @Post()
  @UseGuards(AdminGuard)
  async createGroupClass(
    @Body(new ZodValidationPipe(CreateGroupClassSchema))
    dto: CreateGroupClassDto,
  ): Promise<GroupClass> {
    return this.groupClassesService.createGroupClass(dto);
  }
}
