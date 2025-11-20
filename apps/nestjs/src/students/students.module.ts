import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StudentsService } from "./students.service.js";
import { StudentsController } from "./students.controller.js";
import { StudentPackagesController } from "./controllers/student-packages.controller.js";
import { Student } from "./entities/student.entity.js";
import { AuthModule } from "../auth/auth.module.js";
import { StudentAvailabilityService } from "./services/student-availability.service.js";
import { StudentDashboardService } from "./services/student-dashboard.service.js";
import { Booking } from "../payments/entities/booking.entity.js";
import { Session } from "../sessions/entities/session.entity.js";
import { CourseProgramsModule } from "../course-programs/course-programs.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Booking, Session]),
    AuthModule,
    CourseProgramsModule,
  ],
  controllers: [StudentsController, StudentPackagesController],
  providers: [
    StudentsService,
    StudentAvailabilityService,
    StudentDashboardService,
  ],
  exports: [
    StudentsService,
    StudentAvailabilityService,
    StudentDashboardService,
  ],
})
export class StudentsModule {}
