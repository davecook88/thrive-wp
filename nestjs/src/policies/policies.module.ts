import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CancellationPolicy } from './entities/cancellation-policy.entity.js';
import { PoliciesController } from './policies.controller.js';
import { PoliciesService } from './policies.service.js';
@Module({
  imports: [TypeOrmModule.forFeature([CancellationPolicy])],
  providers: [PoliciesService],
  controllers: [PoliciesController],
  exports: [PoliciesService],
})
export class PoliciesModule {}
