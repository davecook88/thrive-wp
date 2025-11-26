import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { User } from "./entities/user.entity.js";
import { Admin } from "./entities/admin.entity.js";
import { Teacher } from "../teachers/entities/teacher.entity.js";
import { AuthModule } from "../auth/auth.module.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

import { UsersProfileController } from "./users-profile.controller.js";

@Module({
  imports: [TypeOrmModule.forFeature([User, Admin, Teacher]), AuthModule],
  controllers: [UsersController, UsersProfileController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
