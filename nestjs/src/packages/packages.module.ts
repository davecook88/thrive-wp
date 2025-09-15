import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentPackage } from './entities/student-package.entity.js';
import { PackageUse } from './entities/package-use.entity.js';
import { StripeProductMap } from '../payments/entities/stripe-product-map.entity.js';
import { PackagesService } from './packages.service.js';
import { PackagesController } from './packages.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentPackage, PackageUse, StripeProductMap]),
  ],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
