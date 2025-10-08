import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupClass } from './entities/group-class.entity.js';
import * as RRule from 'rrule';
import { Session } from '../sessions/entities/session.entity.js';
import { ServiceType } from '../common/types/class-types.js';
import {
  SessionWithEnrollment,
  SessionWithEnrollmentResponse,
} from './dto/session-with-enrollment.dto.js';

@Injectable()
export class GroupClassesService {
  constructor(
    @InjectRepository(GroupClass)
    private groupClassesRepository: Repository<GroupClass>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
  ) {}

  findAll(): Promise<GroupClass[]> {
    return this.groupClassesRepository.find();
  }

  async generateSessions(groupClassId: number): Promise<Session[]> {
    const groupClass = await this.groupClassesRepository.findOne({
      where: { id: groupClassId },
    });
    if (!groupClass || !groupClass.rrule) {
      return [];
    }

    const rule = RRule.RRule.fromString(groupClass.rrule);
    const dates = rule.all();

    const sessions: Session[] = [];
    for (const date of dates) {
      const session = new Session();
      session.type = ServiceType.GROUP;
      session.groupClassId = groupClass.id;
      session.startAt = date;
      session.endAt = new Date(date.getTime() + 3600 * 1000); // Assuming 1 hour duration
      sessions.push(session);
    }

    return this.sessionsRepository.save(sessions);
  }
  async getAvailableSessions(filters: {
    levelId?: number;
    teacherId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<SessionWithEnrollmentResponse[]> {
    const qb = this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.groupClass', 'groupClass')
      .leftJoinAndSelect('groupClass.level', 'level')
      .leftJoinAndSelect('session.teacher', 'teacher')
      .loadRelationCountAndMap('session.enrolledCount', 'session.bookings')
      .where('session.type = :type', { type: ServiceType.GROUP })
      .andWhere('groupClass.isActive = true')
      .andWhere('session.status = :status', { status: 'SCHEDULED' });

    if (filters.startDate) {
      qb.andWhere('session.startAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      qb.andWhere('session.startAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.levelId) {
      qb.andWhere('groupClass.levelId = :levelId', {
        levelId: filters.levelId,
      });
    }

    if (filters.teacherId) {
      qb.andWhere('session.teacherId = :teacherId', {
        teacherId: filters.teacherId,
      });
    }

    // Cast to SessionWithEnrollment because loadRelationCountAndMap adds enrolledCount at runtime
    const sessions = (await qb.getMany()) as SessionWithEnrollment[];

    return sessions.map((session) => ({
      ...session,
      availableSpots: session.capacityMax - session.enrolledCount,
      isFull: session.enrolledCount >= session.capacityMax,
      canJoinWaitlist: session.enrolledCount >= session.capacityMax,
    }));
  }
}
