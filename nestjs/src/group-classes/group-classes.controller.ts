import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { GroupClassesService } from './group-classes.service.js';
import { GroupClass } from './entities/group-class.entity.js';
import { Session } from '../sessions/entities/session.entity.js';

@Controller('group-classes')
export class GroupClassesController {
  constructor(private readonly groupClassesService: GroupClassesService) {}

  @Get()
  async findAll(): Promise<GroupClass[]> {
    const classes = await this.groupClassesService.findAll();
    return classes;
  }

  @Get('available')
  getAvailableSessions(
    @Query()
    filters: {
      levelId?: number;
      teacherId?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.groupClassesService.getAvailableSessions(filters);
  }

  @Post(':id/generate-sessions')
  generateSessions(@Param('id') id: string): Promise<Session[]> {
    return this.groupClassesService.generateSessions(+id);
  }
}
