import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CancellationPolicy } from "./entities/cancellation-policy.entity.js";
import { PoliciesController } from "./policies.controller.js";
import { PoliciesService } from "./policies.service.js";
import { AuthService } from "../auth/auth.service.js";
import { User } from "../users/entities/user.entity.js";
import { Admin } from "../users/entities/admin.entity.js";
import { Teacher } from "../teachers/entities/teacher.entity.js";
@Module({
  imports: [
    TypeOrmModule.forFeature([CancellationPolicy, User, Admin, Teacher]),
  ],
  providers: [PoliciesService, AuthService],
  controllers: [PoliciesController],
  exports: [PoliciesService],
})
export class PoliciesModule {}
