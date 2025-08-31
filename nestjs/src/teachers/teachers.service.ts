import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Teacher } from './entities/teacher.entity.js';
import { TeacherAvailability, TeacherAvailabilityKind } from './entities/teacher-availability.entity.js';
import { UpdateAvailabilityDto, PreviewAvailabilityDto } from './dto/availability.dto.js';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(TeacherAvailability)
    private availabilityRepository: Repository<TeacherAvailability>,
    private dataSource: DataSource,
  ) {}

  async getTeacherAvailability(teacherId: number) {
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const availabilities = await this.availabilityRepository.find({
      where: { teacherId, isActive: true },
      order: { createdAt: 'ASC' },
    });

    const rules: any[] = [];
    const exceptions: any[] = [];

    for (const avail of availabilities) {
      if (avail.kind === TeacherAvailabilityKind.RECURRING) {
        rules.push({
          id: avail.id,
          weekday: avail.weekday,
          startTime: this.minutesToTimeString(avail.startTimeMinutes!),
          endTime: this.minutesToTimeString(avail.endTimeMinutes!),
        });
      } else if (avail.kind === TeacherAvailabilityKind.BLACKOUT) {
        exceptions.push({
          id: avail.id,
          date: avail.startAt!.toISOString().split('T')[0],
          startTime: avail.startAt ? this.dateToTimeString(avail.startAt) : undefined,
          endTime: avail.endAt ? this.dateToTimeString(avail.endAt) : undefined,
          isBlackout: true,
        });
      }
    }

    return { rules, exceptions };
  }

  async updateTeacherAvailability(teacherId: number, dto: UpdateAvailabilityDto) {
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId },
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
        { teacherId, isActive: true },
        { isActive: false }
      );

      // Insert new rules
      for (const rule of dto.rules) {
        const startMinutes = this.timeStringToMinutes(rule.startTime);
        const endMinutes = this.timeStringToMinutes(rule.endTime);

        if (startMinutes >= endMinutes) {
          throw new BadRequestException('Start time must be before end time');
        }

        await manager.save(TeacherAvailability, {
          teacherId,
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
          const startAt = exception.startTime
            ? new Date(`${exception.date}T${exception.startTime}:00.000Z`)
            : new Date(`${exception.date}T00:00:00.000Z`);

          const endAt = exception.endTime
            ? new Date(`${exception.date}T${exception.endTime}:00.000Z`)
            : new Date(`${exception.date}T23:59:59.999Z`);

          await manager.save(TeacherAvailability, {
            teacherId,
            kind: TeacherAvailabilityKind.BLACKOUT,
            startAt,
            endAt,
            isActive: true,
          });
        }
      }
    });

    return this.getTeacherAvailability(teacherId);
  }

  async previewTeacherAvailability(teacherId: number, dto: PreviewAvailabilityDto) {
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const startDate = new Date(dto.start);
    const endDate = new Date(dto.end);

    // Limit to 90 days
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      throw new BadRequestException('Preview range cannot exceed 90 days');
    }

    const availabilities = await this.availabilityRepository.find({
      where: { teacherId, isActive: true },
    });

    const windows: { start: string; end: string }[] = [];

    // Process each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayWindows = this.expandDayAvailability(currentDate, availabilities);
      windows.push(...dayWindows);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { windows };
  }

  private expandDayAvailability(
    date: Date,
    availabilities: TeacherAvailability[],
  ): { start: string; end: string }[] {
    const windows: { start: string; end: string }[] = [];

    // Get recurring rules for this weekday (0=Sunday, 6=Saturday)
    const weekday = date.getDay();
    const rules = availabilities.filter(
      (a) => a.kind === TeacherAvailabilityKind.RECURRING && a.weekday === weekday
    );

    // Get blackouts for this date
    const blackouts = availabilities.filter(
      (a) =>
        a.kind === TeacherAvailabilityKind.BLACKOUT &&
        a.startAt &&
        a.endAt &&
        this.isSameDay(a.startAt, date)
    );

    for (const rule of rules) {
      const startTime = this.minutesToTimeString(rule.startTimeMinutes!);
      const endTime = this.minutesToTimeString(rule.endTimeMinutes!);

      // Create UTC datetime for this date and time
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      const startUTC = new Date(Date.UTC(year, month, day, ...this.parseTime(startTime)));
      const endUTC = new Date(Date.UTC(year, month, day, ...this.parseTime(endTime)));

      // Check if this window overlaps with any blackout
      const overlapsBlackout = blackouts.some((blackout) => {
        const blackoutStart = blackout.startAt!;
        const blackoutEnd = blackout.endAt!;
        return startUTC < blackoutEnd && endUTC > blackoutStart;
      });

      if (!overlapsBlackout) {
        windows.push({
          start: startUTC.toISOString(),
          end: endUTC.toISOString(),
        });
      }
    }

    return windows.sort((a, b) => a.start.localeCompare(b.start));
  }

  private validateRules(rules: any[]) {
    const byWeekday: Record<number, any[]> = {};

    for (const rule of rules) {
      if (!byWeekday[rule.weekday]) {
        byWeekday[rule.weekday] = [];
      }
      byWeekday[rule.weekday].push(rule);
    }

    for (const weekdayRules of Object.values(byWeekday)) {
      // Sort by start time
      weekdayRules.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

      for (let i = 0; i < weekdayRules.length - 1; i++) {
        const current = weekdayRules[i];
        const next = weekdayRules[i + 1];

        if (current.endTime > next.startTime) {
          throw new BadRequestException(`Overlapping rules for weekday ${current.weekday}`);
        }
      }
    }
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
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
