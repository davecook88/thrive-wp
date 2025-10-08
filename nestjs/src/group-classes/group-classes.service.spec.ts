import { Test, TestingModule } from '@nestjs/testing';
import { GroupClassesService } from './group-classes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GroupClass } from './entities/group-class.entity';
import { Repository } from 'typeorm';

import * as RRule from 'rrule';

describe('GroupClassesService', () => {
  let service: GroupClassesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupClassesService,
        {
          provide: getRepositoryToken(GroupClass),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<GroupClassesService>(GroupClassesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSessions', () => {
    it('should generate weekly sessions correctly', () => {
      const rrule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6';
      const startDate = new Date('2025-01-01T00:00:00Z');
      const rule = new RRule.RRule({
        freq: RRule.RRule.WEEKLY,
        byweekday: [RRule.RRule.MO, RRule.RRule.WE, RRule.RRule.FR],
        count: 6,
        dtstart: startDate,
      });
      const dates = rule.all();
      expect(dates).toHaveLength(6);
    });
  });
});
