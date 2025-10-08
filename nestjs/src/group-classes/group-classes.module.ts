import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupClass } from './entities/group-class.entity';
import { GroupClassTeacher } from './entities/group-class-teacher.entity';
import { GroupClassesService } from './group-classes.service';
import { GroupClassesController } from './group-classes.controller';

import { Session } from '../sessions/entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GroupClass, GroupClassTeacher, Session])],
  providers: [GroupClassesService],
  controllers: [GroupClassesController],
})
export class GroupClassesModule {}
