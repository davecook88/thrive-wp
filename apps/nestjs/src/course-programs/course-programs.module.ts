import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CourseProgram,
  CourseStep,
  CourseStepOption,
  StudentCourseStepProgress,
} from "./entities/index.js";
import { GroupClass } from "../group-classes/entities/group-class.entity.js";
import { CourseProgramsService } from "./services/course-programs.service.js";
import { CourseStepsService } from "./services/course-steps.service.js";
import { CourseStepProgressService } from "./services/course-step-progress.service.js";
import { AdminCourseProgramsController } from "./controllers/admin-course-programs.controller.js";
import { CourseProgramsController } from "./controllers/course-programs.controller.js";
import { AuthService } from "../auth/auth.service.js";
import { User } from "../users/entities/user.entity.js";
import { Admin } from "../users/entities/admin.entity.js";
import { Teacher } from "../teachers/entities/teacher.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseProgram,
      CourseStep,
      CourseStepOption,
      StudentCourseStepProgress,
      GroupClass,
      User,
      Admin,
      Teacher,
    ]),
  ],
  controllers: [AdminCourseProgramsController, CourseProgramsController],
  providers: [
    CourseProgramsService,
    CourseStepsService,
    CourseStepProgressService,
    AuthService,
  ],
  exports: [
    CourseProgramsService,
    CourseStepsService,
    CourseStepProgressService,
  ],
})
export class CourseProgramsModule {}
