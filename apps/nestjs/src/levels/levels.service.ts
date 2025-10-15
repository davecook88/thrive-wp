import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Level } from "./entities/level.entity.js";
import { LevelDto } from "@thrive/shared";

@Injectable()
export class LevelsService {
  constructor(
    @InjectRepository(Level)
    private levelsRepository: Repository<Level>,
  ) {}

  findAll(): Promise<LevelDto[]> {
    return this.levelsRepository.find() as Promise<LevelDto[]>;
  }
}
