import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, FindOptionsWhere } from 'typeorm';
import { Teacher } from './entities/teacher.entity.js';
import {
  TeacherAvailability,
  TeacherAvailabilityKind,
} from './entities/teacher-availability.entity.js';
import {
  UpdateAvailabilityDto,
  PreviewAvailabilityDto,
  AvailabilityRuleDto,
  PreviewMyAvailabilityDto,
} from './dto/availability.dto.js';

interface AvailabilityRule {
  id: number;
  weekday: number;
  startTime: string;
  endTime: string;
}

interface AvailabilityException {
  id: number;
  date: string;
  startTime?: string;
  endTime?: string;
  isBlackout: boolean;
}

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(TeacherAvailability)
    private availabilityRepository: Repository<TeacherAvailability>,
    private dataSource: DataSource,
  ) {}

  async getTeacherIdByUserId(userId: number): Promise<number> {
    const teacher = await this.teacherRepository.findOne({
      where: { userId },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher.id;
  }

  async getTeacherAvailability(userId: number) {
    const teacherId = await this.getTeacherIdByUserId(userId);

    if (!teacherId) {
      throw new NotFoundException('Teacher not found');
    }

    const availabilities = await this.availabilityRepository.find({
      where: { teacherId, isActive: true },
      order: { createdAt: 'ASC' },
    });

    const rules: AvailabilityRule[] = [];
    const exceptions: AvailabilityException[] = [];

    for (const avail of availabilities) {
      if (avail.kind === TeacherAvailabilityKind.RECURRING) {
        rules.push({
          id: avail.id,
          weekday: avail.weekday!,
          startTime: this.minutesToTimeString(avail.startTimeMinutes!),
          endTime: this.minutesToTimeString(avail.endTimeMinutes! % (24 * 60)),
        });
      } else if (avail.kind === TeacherAvailabilityKind.BLACKOUT) {
        exceptions.push({
          id: avail.id,
          date: avail.startAt!.toISOString().split('T')[0],
          startTime: avail.startAt
            ? this.dateToTimeString(avail.startAt)
            : undefined,
          endTime: avail.endAt ? this.dateToTimeString(avail.endAt) : undefined,
          isBlackout: true,
        });
      }
    }

    return { rules, exceptions };
  }

  async updateTeacherAvailability(userId: number, dto: UpdateAvailabilityDto) {
    const teacher = await this.teacherRepository.findOne({
      where: { userId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Validate rules for overlaps
    this.validateRules(dto.rules);

    // Use transaction for atomicity
    await this.dataSource.transaction(async (manager) => {
      // Deactivate existing availability
      await manager.update(
        TeacherAvailability,
        { teacherId: teacher.id, isActive: true },
        { isActive: false },
      );

      // Insert new rules
      for (const rule of dto.rules) {
        let startMinutes = this.timeStringToMinutes(rule.startTime);
        let endMinutes = this.timeStringToMinutes(rule.endTime);

        // If end time is before start time, assume it spans to the next day
        if (endMinutes < startMinutes) {
          endMinutes += 24 * 60; // Add 24 hours
        }

        await manager.save(TeacherAvailability, {
          teacherId: teacher.id,
          kind: TeacherAvailabilityKind.RECURRING,
          weekday: rule.weekday,
          startTimeMinutes: startMinutes,
          endTimeMinutes: endMinutes,
          isActive: true,
        });
      }

      // Insert new exceptions
      if (dto.exceptions) {
        for (const exception of dto.exceptions) {
          let startAt = exception.startTime
            ? new Date(`${exception.date}T${exception.startTime}:00.000Z`)
            : new Date(`${exception.date}T00:00:00.000Z`);

          let endAt = exception.endTime
            ? new Date(`${exception.date}T${exception.endTime}:00.000Z`)
            : new Date(`${exception.date}T23:59:59.999Z`);

          // If end time is before start time, assume it spans to the next day
          if (exception.startTime && exception.endTime) {
            const startMinutes = this.timeStringToMinutes(exception.startTime);
            const endMinutes = this.timeStringToMinutes(exception.endTime);
            if (endMinutes < startMinutes) {
              endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
            }
          }

          await manager.save(TeacherAvailability, {
            teacherId: teacher.id,
            kind: TeacherAvailabilityKind.BLACKOUT,
            startAt,
            endAt,
            isActive: true,
          });
        }
      }
    });

    return this.getTeacherAvailability(teacher.id);
  }

  async previewTeacherAvailability(
    teacherIds: number[],
    dto: PreviewAvailabilityDto | PreviewMyAvailabilityDto,
  ) {
    // Check if all teachers exist
    for (const teacherId of teacherIds) {
      const teacher = await this.teacherRepository.findOne({
        where: { id: teacherId },
      });
      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }
    }

    const where: FindOptionsWhere<TeacherAvailability> = teacherIds
      ? { teacherId: In(teacherIds), isActive: true }
      : { isActive: true };
    const availabilities = await this.availabilityRepository.find({
      where,
    });
    const windows: { start: string; end: string; teacherIds: number[] }[] = [];
    const startDate = new Date(dto.start);
    const endDate = new Date(dto.end);
    // Limit to 90 days
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      throw new BadRequestException('Preview range cannot exceed 90 days');
    }
    // Process each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayWindows = this.expandDayAvailability(
        currentDate,
        availabilities,
      );
      windows.push(...dayWindows);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return { windows };
  }

  async getPublicTeacherById(id: number) {
    const t = await this.teacherRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'u')
      .where('t.id = :id', { id })
      .andWhere('t.is_active = 1')
      .getOne();
    if (!t) {
      throw new NotFoundException('Teacher not found');
    }
    return {
      userId: t.userId,
      teacherId: t.id,
      firstName: (t.user as any)?.firstName ?? '',
      lastName: (t.user as any)?.lastName ?? '',
      name:
        [
          ((t.user as any)?.firstName ?? '').trim(),
          ((t.user as any)?.lastName ?? '').trim(),
        ]
          .filter(Boolean)
          .join(' ') || 'Teacher',
      bio: t.bio ?? null,
    };
  }

  private expandDayAvailability(
    date: Date,
    availabilities: TeacherAvailability[],
  ): { start: string; end: string; teacherIds: number[] }[] {
    {
      const teacherIds = new Set<number>();
      for (const avail of availabilities) {
        teacherIds.add(avail.teacherId);
      }
      const windowsMap = new Map<
        string,
        { start: Date; end: Date; teacherIds: number[] }
      >();
      for (const teacher of teacherIds) {
        const teacherAvailabilities = availabilities.filter(
          (a) => a.teacherId === teacher,
        );
        const weekday = date.getUTCDay();
        const rules = teacherAvailabilities.filter(
          (a) =>
            a.kind === TeacherAvailabilityKind.RECURRING &&
            a.weekday === weekday,
        );
        const blackouts = teacherAvailabilities.filter(
          (a) =>
            a.kind === TeacherAvailabilityKind.BLACKOUT &&
            a.startAt &&
            a.endAt &&
            this.isSameDay(a.startAt, date),
        );
        for (const rule of rules) {
          const startTime = this.minutesToTimeString(rule.startTimeMinutes!);
          const endTime = this.minutesToTimeString(rule.endTimeMinutes!);
          const year = date.getUTCFullYear();
          const month = date.getUTCMonth();
          const day = date.getUTCDate();
          const startUTC = new Date(
            Date.UTC(year, month, day, ...this.parseTime(startTime)),
          );
          const endUTC = new Date(
            Date.UTC(year, month, day, ...this.parseTime(endTime)),
          );
          const overlapsBlackout = blackouts.some((blackout) => {
            const blackoutStart = blackout.startAt!;
            const blackoutEnd = blackout.endAt!;
            return startUTC < blackoutEnd && endUTC > blackoutStart;
          });
          if (!overlapsBlackout) {
            const key = `${startUTC.toISOString()}-${endUTC.toISOString()}`;
            if (!windowsMap.has(key)) {
              windowsMap.set(key, {
                start: startUTC,
                end: endUTC,
                teacherIds: [],
              });
            }
            windowsMap.get(key)!.teacherIds.push(teacher);
          }
        }
      }
      return Array.from(windowsMap.values())
        .map((w) => ({
          start: w.start.toISOString(),
          end: w.end.toISOString(),
          teacherIds: w.teacherIds,
        }))
        .sort((a, b) => a.start.localeCompare(b.start));
    }
  }

  private validateRules(rules: AvailabilityRuleDto[]) {
    const byWeekday: Record<number, AvailabilityRuleDto[]> = {};

    for (const rule of rules) {
      if (!byWeekday[rule.weekday]) {
        byWeekday[rule.weekday] = [];
      }
      byWeekday[rule.weekday].push(rule);
    }

    for (const weekdayRules of Object.values(byWeekday)) {
      // Sort by start time
      weekdayRules.sort((a: AvailabilityRuleDto, b: AvailabilityRuleDto) =>
        a.startTime.localeCompare(b.startTime),
      );

      for (let i = 0; i < weekdayRules.length - 1; i++) {
        const current = weekdayRules[i];
        const next = weekdayRules[i + 1];

        if (current.endTime > next.startTime) {
          throw new BadRequestException(
            `Overlapping rules for weekday ${current.weekday}`,
          );
        }
      }
    }
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getUTCFullYear() === date2.getUTCFullYear() &&
      date1.getUTCMonth() === date2.getUTCMonth() &&
      date1.getUTCDate() === date2.getUTCDate()
    );
  }

  private parseTime(time: string): [number, number, number, number] {
    const [hours, minutes] = time.split(':').map(Number);
    return [hours, minutes, 0, 0];
  }

  private timeStringToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private dateToTimeString(date: Date): string {
    return date.toISOString().substring(11, 16);
  }
}
