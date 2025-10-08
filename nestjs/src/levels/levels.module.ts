import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Level } from './entities/level.entity.js';
import { LevelsService } from './levels.service.js';
import { LevelsController } from './levels.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Level])],
  providers: [LevelsService],
  controllers: [LevelsController],
})
export class LevelsModule {}
