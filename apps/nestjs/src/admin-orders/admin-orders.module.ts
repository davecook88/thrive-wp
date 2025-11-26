import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import {
  AdminOrdersController,
  AdminSalesController,
  AdminStudentPackagesController,
} from "./admin-orders.controller.js";
import { AdminOrdersService } from "./admin-orders.service.js";
import { Order } from "../payments/entities/order.entity.js";
import { OrderItem } from "../payments/entities/order-item.entity.js";
import { Student } from "../students/entities/student.entity.js";
import { Booking } from "../payments/entities/booking.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";
import { PackageUse } from "../packages/entities/package-use.entity.js";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Student,
      Booking,
      StudentPackage,
      PackageUse,
    ]),
  ],
  controllers: [
    AdminOrdersController,
    AdminSalesController,
    AdminStudentPackagesController,
  ],
  providers: [AdminOrdersService],
  exports: [AdminOrdersService],
})
export class AdminOrdersModule {}
