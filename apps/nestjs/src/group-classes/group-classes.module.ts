import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GroupClass } from "./entities/group-class.entity.js";
import { GroupClassTeacher } from "./entities/group-class-teacher.entity.js";
import { GroupClassLevel } from "./entities/group-class-level.entity.js";
import { GroupClassesService } from "./group-classes.service.js";
import { GroupClassesController } from "./group-classes.controller.js";

import { Session } from "../sessions/entities/session.entity.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupClass,
      GroupClassTeacher,
      GroupClassLevel,
      Session,
    ]),
    AuthModule,
  ],
  providers: [GroupClassesService],
  controllers: [GroupClassesController],
})
export class GroupClassesModule {}
