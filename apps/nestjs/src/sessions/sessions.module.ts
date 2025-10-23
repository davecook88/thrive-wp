import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SessionsService } from "./services/sessions.service.js";
import { SessionController } from "./session.controller.js";
import { TeachersModule } from "../teachers/teachers.module.js";
import { StudentsModule } from "../students/students.module.js";
import { Session } from "./entities/session.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    TeachersModule,
    StudentsModule,
  ],
  controllers: [SessionController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
