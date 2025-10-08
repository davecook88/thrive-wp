import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { GroupClassesService } from './group-classes.service';
import { GroupClass } from './entities/group-class.entity';
import { Session } from '../sessions/entities/session.entity';

@Controller('group-classes')
export class GroupClassesController {
  constructor(private readonly groupClassesService: GroupClassesService) {}

  @Get()
  findAll(): Promise<GroupClass[]> {
    return this.groupClassesService.findAll();
  }

  @Get('available')
  getAvailableSessions(@Query() filters: { levelId?: number; teacherId?: number; startDate?: Date; endDate?: Date }): Promise<any[]> {
    return this.groupClassesService.getAvailableSessions(filters);
  }

  @Post(':id/generate-sessions')
  generateSessions(@Param('id') id: string): Promise<Session[]> {
    return this.groupClassesService.generateSessions(+id);
  }
}
