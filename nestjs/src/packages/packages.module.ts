import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackagesController, PublicPackagesController } from './packages.controller.js';
import { PackagesService } from './packages.service.js';
import { StripeProductMap } from '../payments/entities/stripe-product-map.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([StripeProductMap]),
    AuthModule,
  ],
  controllers: [PackagesController, PublicPackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}