import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StudentsService } from "./students.service.js";
import { StudentsController } from "./students.controller.js";
import { Student } from "./entities/student.entity.js";
import { AuthModule } from "../auth/auth.module.js";
import { StudentAvailabilityService } from "./services/student-availability.service.js";
import { Booking } from "../payments/entities/booking.entity.js";
import { Session } from "../sessions/entities/session.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      Booking,
      Session,
    ]),
    AuthModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService, StudentAvailabilityService],
  exports: [StudentsService, StudentAvailabilityService],
})
export class StudentsModule {}
