import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller.js";
import { GoogleStrategy } from "./strategies/google.strategy.js";
import { AuthService } from "./auth.service.js";
import { User } from "../users/entities/user.entity.js";
import { Admin } from "../users/entities/admin.entity.js";
import { Teacher } from "../teachers/entities/teacher.entity.js";
import { StudentGuard } from "./student.guard.js";
import { TeacherGuard } from "./teacher.guard.js";
import { AdminGuard } from "./admin.guard.js";

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ session: false }),
    TypeOrmModule.forFeature([User, Admin, Teacher]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    ConfigService,
    StudentGuard,
    TeacherGuard,
    AdminGuard,
  ],
  exports: [AuthService, StudentGuard, TeacherGuard, AdminGuard],
})
export class AuthModule {}
