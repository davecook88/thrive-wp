import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CourseProgram,
  CourseProgramLevel,
  CourseStep,
  CourseStepOption,
  StudentCourseStepProgress,
  CourseCohort,
  CourseCohortSession,
} from "./entities/index.js";
import { GroupClass } from "../group-classes/entities/group-class.entity.js";
import { CourseProgramsService } from "./services/course-programs.service.js";
import { CourseStepsService } from "./services/course-steps.service.js";
import { CourseStepProgressService } from "./services/course-step-progress.service.js";
import { CohortsService } from "./services/cohorts.service.js";
import {
  AdminCourseProgramsController,
  AdminCohortsController,
} from "./controllers/admin-course-programs.controller.js";
import { CourseProgramsController } from "./controllers/course-programs.controller.js";
import { AuthService } from "../auth/auth.service.js";
import { User } from "../users/entities/user.entity.js";
import { Admin } from "../users/entities/admin.entity.js";
import { Teacher } from "../teachers/entities/teacher.entity.js";
import { StripeProductService } from "../common/services/stripe-product.service.js";
import { StripeProductMap } from "../payments/entities/stripe-product-map.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseProgram,
      CourseProgramLevel,
      CourseStep,
      CourseStepOption,
      StudentCourseStepProgress,
      CourseCohort,
      CourseCohortSession,
      GroupClass,
      User,
      Admin,
      Teacher,
      StripeProductMap,
    ]),
  ],
  controllers: [
    AdminCourseProgramsController,
    AdminCohortsController,
    CourseProgramsController,
  ],
  providers: [
    CourseProgramsService,
    CourseStepsService,
    CourseStepProgressService,
    CohortsService,
    AuthService,
    StripeProductService,
  ],
  exports: [
    CourseProgramsService,
    CourseStepsService,
    CourseStepProgressService,
    CohortsService,
  ],
})
export class CourseProgramsModule {}
