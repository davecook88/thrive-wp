import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StudentPackage } from "./entities/student-package.entity.js";
import { PackageUse } from "./entities/package-use.entity.js";
import { PackageAllowance } from "./entities/package-allowance.entity.js";
import { StripeProductMap } from "../payments/entities/stripe-product-map.entity.js";
import { Student } from "../students/entities/student.entity.js";
import { Session } from "../sessions/entities/session.entity.js";
import { Booking } from "../payments/entities/booking.entity.js";
import { PackagesService } from "./packages.service.js";
import { PackagesController } from "./packages.controller.js";
import { AdminPackagesController } from "./admin-packages.controller.js";
import { AuthModule } from "../auth/auth.module.js";
import { StudentsModule } from "../students/students.module.js";
import { SessionsModule } from "../sessions/sessions.module.js";
import { StripeProductService } from "../common/services/stripe-product.service.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentPackage,
      PackageUse,
      PackageAllowance,
      StripeProductMap,
      Student,
      Session,
      Booking,
    ]),
    AuthModule,
    StudentsModule,
    SessionsModule,
  ],
  controllers: [PackagesController, AdminPackagesController],
  providers: [PackagesService, StripeProductService],
  exports: [PackagesService],
})
export class PackagesModule {}
