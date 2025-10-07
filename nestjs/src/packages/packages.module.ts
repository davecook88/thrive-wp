import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentPackage } from './entities/student-package.entity.js';
import { PackageUse } from './entities/package-use.entity.js';
import { StripeProductMap } from '../payments/entities/stripe-product-map.entity.js';
import { PackagesService } from './packages.service.js';
import { PackagesController } from './packages.controller.js';
import { AdminPackagesController } from './admin-packages.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { StudentsModule } from '../students/students.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentPackage, PackageUse, StripeProductMap]),
    AuthModule,
    StudentsModule,
  ],
  controllers: [PackagesController, AdminPackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
