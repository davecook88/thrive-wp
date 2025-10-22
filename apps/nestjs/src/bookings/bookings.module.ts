import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Booking } from "../payments/entities/booking.entity.js";
import { Session } from "../sessions/entities/session.entity.js";
import { Student } from "../students/entities/student.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";

import { PoliciesModule } from "../policies/policies.module.js";
import { PackagesModule } from "../packages/packages.module.js";
import { WaitlistsModule } from "../waitlists/waitlists.module.js";
import { BookingsService } from "./bookings.service.js";
import { BookingsController } from "./bookings.controller.js";
import { PackageUse } from "../packages/entities/package-use.entity.js";
import { PackageAllowance } from "../packages/entities/package-allowance.entity.js";
import { StripeProductMap } from "../payments/entities/stripe-product-map.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Session,
      Student,
      StudentPackage,
      PackageUse,
      PackageAllowance,
      StripeProductMap,
    ]),
    PoliciesModule,
    PackagesModule,
    WaitlistsModule,
  ],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
