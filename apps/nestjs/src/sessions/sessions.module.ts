import { Module } from "@nestjs/common";
import { SessionsService } from "./services/sessions.service.js";
import { TeachersModule } from "../teachers/teachers.module.js";
import { StudentsModule } from "../students/students.module.js";

@Module({
  imports: [TeachersModule, StudentsModule],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
