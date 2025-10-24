import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentsController } from "./payments.controller.js";
import { WebhooksController } from "./webhooks.controller.js";
import { PaymentsService } from "./payments.service.js";
import { StripeProductMap } from "./entities/stripe-product-map.entity.js";
import { Student } from "../students/entities/student.entity.js";
import { Session } from "../sessions/entities/session.entity.js";
import { Booking } from "./entities/booking.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";
import { PackageUse } from "../packages/entities/package-use.entity.js";
import { PackageAllowance } from "../packages/entities/package-allowance.entity.js";
import { SessionsModule } from "../sessions/sessions.module.js";
import { PackagesModule } from "../packages/packages.module.js";
import { CourseProgramsModule } from "../course-programs/course-programs.module.js";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      StripeProductMap,
      Student,
      Session,
      Booking,
      StudentPackage,
      PackageUse,
      PackageAllowance,
    ]),
    SessionsModule,
    PackagesModule,
    CourseProgramsModule,
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
