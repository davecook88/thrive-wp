import { Controller, Get } from "@nestjs/common";
import { LevelsService } from "./levels.service.js";
import { LevelDto } from "@thrive/shared";

@Controller("levels")
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get()
  findAll(): Promise<LevelDto[]> {
    return this.levelsService.findAll();
  }
}
