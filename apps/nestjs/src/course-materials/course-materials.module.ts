import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CourseStepMaterial } from "./entities/course-step-material.entity.js";
import { MaterialQuestion } from "./entities/material-question.entity.js";
import { StudentAnswer } from "./entities/student-answer.entity.js";
import { StudentCourseStepMaterialProgress } from "./entities/student-course-step-material-progress.entity.js";
import { CourseMaterialsController } from "./course-materials.controller.js";
import { CourseMaterialsService } from "./course-materials.service.js";
import { CourseStep } from "../course-programs/entities/course-step.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseStepMaterial,
      MaterialQuestion,
      StudentAnswer,
      StudentCourseStepMaterialProgress,
      CourseStep,
      StudentPackage,
    ]),
    AuthModule,
  ],
  controllers: [CourseMaterialsController],
  providers: [CourseMaterialsService],
  exports: [CourseMaterialsService],
})
export class CourseMaterialsModule {}
