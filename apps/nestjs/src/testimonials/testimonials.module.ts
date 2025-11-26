import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Testimonial } from "./entities/testimonial.entity.js";
import { Student } from "../students/entities/student.entity.js";
import { Teacher } from "../teachers/entities/teacher.entity.js";
import { CourseProgram } from "../course-programs/entities/course-program.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";
import { Booking } from "../payments/entities/booking.entity.js";
import { TestimonialsService } from "./testimonials.service.js";
import {
  TestimonialsController,
  StudentTestimonialsController,
  AdminTestimonialsController,
} from "./testimonials.controller.js";
import { UsersModule } from "../users/users.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Testimonial,
      Student,
      Teacher,
      CourseProgram,
      StudentPackage,
      Booking,
    ]),
    UsersModule, // For UsersService in controllers
    AuthModule, // For guards
  ],
  controllers: [
    TestimonialsController,
    StudentTestimonialsController,
    AdminTestimonialsController,
  ],
  providers: [TestimonialsService],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
