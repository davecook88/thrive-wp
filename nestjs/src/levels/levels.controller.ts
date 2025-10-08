import { Controller, Get } from '@nestjs/common';
import { LevelsService } from './levels.service.js';
import { Level } from './entities/level.entity.js';

@Controller('levels')
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get()
  findAll(): Promise<Level[]> {
    return this.levelsService.findAll();
  }
}
