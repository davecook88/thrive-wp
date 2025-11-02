import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In, FindOptionsWhere } from "typeorm";
import { Teacher } from "./entities/teacher.entity.js";
import {
  TeacherAvailability,
  TeacherAvailabilityKind,
} from "./entities/teacher-availability.entity.js";
import {
  UpdateAvailabilityDto,
  PreviewAvailabilityDto,
  AvailabilityRuleDto,
  PreviewMyAvailabilityDto,
} from "./dto/availability.dto.js";
import type {
  GetAvailabilityResponse,
  PreviewAvailabilityResponse,
  PublicTeacherDto,
} from "@thrive/shared";

// (local transient shapes are replaced by shared types)

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
      throw new NotFoundException("Teacher not found");
    }
    return teacher.id;
  }

  async getTeacherAvailability(
    userId: number,
  ): Promise<GetAvailabilityResponse> {
    const teacherId = await this.getTeacherIdByUserId(userId);

    if (!teacherId) {
      throw new NotFoundException("Teacher not found");
    }

    const availabilities = await this.availabilityRepository.find({
      where: { teacherId, isActive: true },
      order: { createdAt: "ASC" },
    });

    const rules: Array<{
      id: number;
      dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      startTime: string;
      endTime: string;
      maxBookings?: number | null;
    }> = [];
    const exceptions: Array<{
      id: number;
      date: string;
      start?: string | null;
      end?: string | null;
      isAvailable: boolean;
      note?: string | null;
    }> = [];

    for (const avail of availabilities) {
      if (avail.kind === TeacherAvailabilityKind.RECURRING) {
        rules.push({
          id: avail.id,
          dayOfWeek: avail.weekday! as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          startTime: this.minutesToTimeString(avail.startTimeMinutes!),
          endTime: this.minutesToTimeString(avail.endTimeMinutes! % (24 * 60)),
          maxBookings: null,
        });
      } else if (avail.kind === TeacherAvailabilityKind.BLACKOUT) {
        exceptions.push({
          id: avail.id,
          date: avail.startAt!.toISOString().split("T")[0],
          start: avail.startAt ? avail.startAt.toISOString() : null,
          end: avail.endAt ? avail.endAt.toISOString() : null,
          isAvailable: false,
          note: null,
        });
      }
    }

    // Minimal: attach timezone. System stores times as UTC.
    return { timezone: "UTC", rules, exceptions };
  }

  async updateTeacherAvailability(
    userId: number,
    dto: UpdateAvailabilityDto,
  ): Promise<GetAvailabilityResponse> {
    const teacher = await this.teacherRepository.findOne({
      where: { userId },
    });

    if (!teacher) {
      throw new NotFoundException("Teacher not found");
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
        const startMinutes = this.timeStringToMinutes(rule.startTime);
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
          const startAt = exception.startTime
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
  ): Promise<PreviewAvailabilityResponse> {
    // Check if all teachers exist
    for (const teacherId of teacherIds) {
      const teacher = await this.teacherRepository.findOne({
        where: { id: teacherId },
      });
      if (!teacher) {
        throw new NotFoundException("Teacher not found");
      }
    }

    const where: FindOptionsWhere<TeacherAvailability> = teacherIds
      ? { teacherId: In(teacherIds), isActive: true }
      : { isActive: true };
    const availabilities = await this.availabilityRepository.find({
      where,
    });
    console.log("Found availabilities:", availabilities);
    const windows: { start: string; end: string; teacherIds: number[] }[] = [];
    const startDate = new Date(dto.start);
    const endDate = new Date(dto.end);
    // Limit to 90 days
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      throw new BadRequestException("Preview range cannot exceed 90 days");
    }
    // Prefetch all scheduled sessions for the full range in one query
    const rangeStart = new Date(startDate);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const teacherIdSet = new Set<number>(teacherIds ?? []);
    // Fall back to teacher IDs inferred from availabilities if none supplied
    if (teacherIdSet.size === 0) {
      for (const a of availabilities) teacherIdSet.add(a.teacherId);
    }

    const allSessions = await this.getScheduledSessionsForRange(
      Array.from(teacherIdSet),
      rangeStart,
      rangeEnd,
    );
    const sessionsByTeacher = new Map<
      number,
      Array<{ startAt: Date; endAt: Date }>
    >();
    for (const s of allSessions) {
      const arr = sessionsByTeacher.get(s.teacherId) ?? [];
      arr.push({ startAt: s.startAt, endAt: s.endAt });
      sessionsByTeacher.set(s.teacherId, arr);
    }

    // Process each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayWindows = this.expandDayAvailability(
        currentDate,
        availabilities,
        sessionsByTeacher,
      );

      windows.push(...dayWindows);
      // advance by one day in UTC to avoid local timezone shifting weekdays
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    // Convert windows shape to include `available` boolean and optional reason
    const converted = windows.map((w) => ({
      start: w.start,
      end: w.end,
      available: true,
      reason: undefined,
      teacherIds: w.teacherIds,
    }));
    return { windows: converted };
  }

  async getPublicTeacherById(id: number): Promise<PublicTeacherDto> {
    const t = await this.teacherRepository
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.user", "u")
      .where("t.id = :id", { id })
      .andWhere("t.is_active = 1")
      .getOne();
    if (!t) {
      throw new NotFoundException("Teacher not found");
    }
    return t.toPublicDto();
  }

  async getMyProfile(userId: number): Promise<PublicTeacherDto> {
    const t = await this.teacherRepository
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.user", "u")
      .where("t.user_id = :userId", { userId })
      .getOne();

    console.log("Fetched teacher profile:", t);
    if (!t) {
      throw new NotFoundException("Teacher profile not found");
    }
    const dto = t.toPublicDto();
    console.log("Mapped teacher profile DTO:", dto);
    return dto;
  }

  async updateMyProfile(
    userId: number,
    updateData: {
      bio?: string | null;
      avatarUrl?: string | null;
      birthplace?: {
        city?: string;
        country?: string;
        lat?: number;
        lng?: number;
      };
      currentLocation?: {
        city?: string;
        country?: string;
        lat?: number;
        lng?: number;
      };
      specialties?: string[];
      yearsExperience?: number;
      languagesSpoken?: string[];
    },
  ) {
    const teacher = await this.teacherRepository.findOne({
      where: { userId },
    });

    if (!teacher) {
      throw new NotFoundException("Teacher profile not found");
    }

    // Update only provided fields (explicitly allow null to clear fields)
    if (updateData.bio !== undefined) teacher.bio = updateData.bio;
    if (updateData.avatarUrl !== undefined)
      teacher.avatarUrl = updateData.avatarUrl;
    if (updateData.birthplace !== undefined)
      teacher.birthplace = updateData.birthplace;
    if (updateData.currentLocation !== undefined)
      teacher.currentLocation = updateData.currentLocation;
    if (updateData.specialties !== undefined)
      teacher.specialties = updateData.specialties;
    if (updateData.yearsExperience !== undefined)
      teacher.yearsExperience = updateData.yearsExperience;
    if (updateData.languagesSpoken !== undefined)
      teacher.languagesSpoken = updateData.languagesSpoken;

    await this.teacherRepository.save(teacher);

    return this.getMyProfile(userId);
  }

  private expandDayAvailability(
    date: Date,
    availabilities: TeacherAvailability[],
    sessionsByTeacher: Map<number, Array<{ startAt: Date; endAt: Date }>>,
  ): { start: string; end: string; teacherIds: number[] }[] {
    {
      const teacherIds = new Set<number>();
      for (const avail of availabilities) {
        teacherIds.add(avail.teacherId);
      }
      // Collect per-teacher raw available intervals first
      const perTeacherIntervals = new Map<
        number,
        Array<{ start: Date; end: Date }>
      >();

      // Define day boundaries (UTC) once to filter preloaded sessions
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setUTCHours(23, 59, 59, 999);

      for (const teacher of teacherIds) {
        const teacherAvailabilities = availabilities.filter(
          (a) => a.teacherId === teacher,
        );
        // Use UTC weekday since availability rules are interpreted with UTC-stored times
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

        // Get preloaded sessions for this specific teacher that intersect the day
        const teacherSessions = (sessionsByTeacher.get(teacher) ?? [])
          // Ensure we only consider sessions that overlap the day
          .filter((s) => s.startAt < dayEnd && s.endAt > dayStart);

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

          // Build list of blocked intervals (blackouts + scheduled sessions) intersecting this rule
          const blockedIntervals: { start: Date; end: Date }[] = [];

          for (const blackout of blackouts) {
            const bStart = blackout.startAt!;
            const bEnd = blackout.endAt!;
            if (startUTC < bEnd && endUTC > bStart) {
              blockedIntervals.push({
                start: new Date(Math.max(startUTC.getTime(), bStart.getTime())),
                end: new Date(Math.min(endUTC.getTime(), bEnd.getTime())),
              });
            }
          }

          for (const session of teacherSessions) {
            const sStart = session.startAt;
            const sEnd = session.endAt;

            if (startUTC < sEnd && endUTC > sStart) {
              blockedIntervals.push({
                start: new Date(Math.max(startUTC.getTime(), sStart.getTime())),
                end: new Date(Math.min(endUTC.getTime(), sEnd.getTime())),
              });
            }
          }

          // If no blocks, add full window
          if (blockedIntervals.length === 0) {
            const arr = perTeacherIntervals.get(teacher) ?? [];
            arr.push({ start: startUTC, end: endUTC });
            perTeacherIntervals.set(teacher, arr);
            continue;
          }

          // Merge overlapping/adjacent blocked intervals
          blockedIntervals.sort(
            (a, b) => a.start.getTime() - b.start.getTime(),
          );
          const merged: { start: Date; end: Date }[] = [];
          for (const interval of blockedIntervals) {
            if (
              merged.length === 0 ||
              interval.start.getTime() > merged[merged.length - 1].end.getTime()
            ) {
              merged.push({
                start: new Date(interval.start),
                end: new Date(interval.end),
              });
            } else {
              // Overlap or touch: extend end
              merged[merged.length - 1].end = new Date(
                Math.max(
                  merged[merged.length - 1].end.getTime(),
                  interval.end.getTime(),
                ),
              );
            }
          }

          // Subtract merged blocks from rule window
          let cursor = new Date(startUTC);
          for (const block of merged) {
            if (block.start.getTime() > cursor.getTime()) {
              const s = new Date(cursor);
              const e = new Date(block.start);
              const arr = perTeacherIntervals.get(teacher) ?? [];
              arr.push({ start: s, end: e });
              perTeacherIntervals.set(teacher, arr);
            }
            // Move cursor past the block
            if (block.end.getTime() > cursor.getTime()) {
              cursor = new Date(block.end);
            }
          }
          // Remainder after last block
          if (cursor.getTime() < endUTC.getTime()) {
            const s = new Date(cursor);
            const e = new Date(endUTC);
            const arr = perTeacherIntervals.get(teacher) ?? [];
            arr.push({ start: s, end: e });
            perTeacherIntervals.set(teacher, arr);
          }
        }
      }

      // Global segmentation: split the day by all edges to align windows across teachers
      const edgeTimes = new Set<number>();
      for (const intervals of perTeacherIntervals.values()) {
        for (const it of intervals) {
          if (it.start.getTime() < it.end.getTime()) {
            edgeTimes.add(it.start.getTime());
            edgeTimes.add(it.end.getTime());
          }
        }
      }

      const edges = Array.from(edgeTimes.values()).sort((a, b) => a - b);
      const segments: { start: Date; end: Date; teacherIds: number[] }[] = [];
      for (let i = 0; i < edges.length - 1; i++) {
        const segStart = new Date(edges[i]);
        const segEnd = new Date(edges[i + 1]);
        if (segStart.getTime() >= segEnd.getTime()) continue;
        const teachersCovering: number[] = [];
        for (const [tId, intervals] of perTeacherIntervals.entries()) {
          const covers = intervals.some(
            (iv) =>
              iv.start.getTime() <= segStart.getTime() &&
              iv.end.getTime() >= segEnd.getTime(),
          );
          if (covers) teachersCovering.push(tId);
        }
        if (teachersCovering.length > 0) {
          segments.push({
            start: segStart,
            end: segEnd,
            teacherIds: teachersCovering.sort((a, b) => a - b),
          });
        }
      }

      const result = segments
        .map((w) => ({
          start: w.start.toISOString(),
          end: w.end.toISOString(),
          teacherIds: w.teacherIds,
        }))
        .sort((a, b) => a.start.localeCompare(b.start));
      return result;
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
    const [hours, minutes] = time.split(":").map(Number);
    return [hours, minutes, 0, 0];
  }

  private timeStringToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  }

  private dateToTimeString(date: Date): string {
    return date.toISOString().substring(11, 16);
  }

  private async getScheduledSessionsForRange(
    teacherIds: number[],
    start: Date,
    end: Date,
  ): Promise<Array<{ teacherId: number; startAt: Date; endAt: Date }>> {
    if (teacherIds.length === 0) return [];
    // Use raw SQL for efficiency; ensure snake_case and status filter
    const params: {
      teacherIds: number[];
      start: Date;
      end: Date;
    } = {
      teacherIds: [],
      start,
      end,
    };
    const teacherPlaceholders = teacherIds
      .map((id) => {
        params.teacherIds.push(id);
        return "?";
      })
      .join(",");
    // Overlap condition: session.start_at <= rangeEnd AND session.end_at >= rangeStart
    params.start = start;
    params.end = end;
    const sql = `
      SELECT teacher_id AS teacherId, start_at AS startAt, end_at AS endAt
      FROM session
      WHERE deleted_at IS NULL
        AND status = 'SCHEDULED'
        AND teacher_id IN (${teacherPlaceholders})
    AND start_at <= ?
    AND end_at >= ?
    `;
    const rows = await this.dataSource.query<
      {
        teacherId: number;
        startAt: Date;
        endAt: Date;
      }[]
    >(sql, [...params.teacherIds, params.end, params.start]);
    // Normalize to Date objects
    return rows.map((r) => ({
      teacherId: Number(r.teacherId),
      startAt: new Date(r.startAt),
      endAt: new Date(r.endAt),
    }));
  }

  async getTeacherStats(userId: number) {
    const teacher = await this.teacherRepository.findOne({
      where: { userId },
    });

    if (!teacher) {
      return {
        nextSession: null,
        totalCompleted: 0,
        totalScheduled: 0,
        activeStudents: 0,
      };
    }

    // Get next upcoming session
    const nextSessionQuery = await this.dataSource.query<
      {
        id: number;
        class_type: string;
        start_at: Date;
        end_at: Date;
        student_id: number;
        meeting_url: string | null;
        student_name: string;
      }[]
    >(
      `
      SELECT
        s.id,
        s.type as class_type,
        s.start_at,
        s.end_at,
        b.student_id,
        s.meeting_url,
        concat(first_name,' ',last_name) as student_name
      FROM session s
      JOIN booking b ON b.session_id = s.id
      JOIN student st ON st.id = b.student_id
      JOIN user u ON u.id = st.user_id
      WHERE s.teacher_id = ?
      AND s.deleted_at IS NULL
      AND b.status = 'CONFIRMED'
      AND s.status = 'SCHEDULED'
      AND s.start_at > NOW()
      ORDER BY s.start_at ASC
      LIMIT 1
    `,
      [teacher.id],
    );

    const nextSession = nextSessionQuery[0]
      ? {
          id: nextSessionQuery[0].id,
          classType: nextSessionQuery[0].class_type,
          startAt: new Date(nextSessionQuery[0].start_at).toISOString(),
          endAt: new Date(nextSessionQuery[0].end_at).toISOString(),
          studentId: nextSessionQuery[0].student_id,
          studentName: nextSessionQuery[0].student_name,
          meetingUrl: nextSessionQuery[0].meeting_url,
        }
      : null;

    // Get total completed sessions
    const completedResult = await this.dataSource.query<{ count: number }[]>(
      `
      SELECT COUNT(*) as count
      FROM session s
      JOIN booking b ON b.session_id = s.id
      WHERE s.teacher_id = ?
      AND s.deleted_at IS NULL
      AND b.status = 'CONFIRMED'
      AND s.status = 'COMPLETED'
    `,
      [teacher.id],
    );
    const totalCompleted = Number(completedResult[0]?.count || 0);

    // Get total scheduled sessions
    const scheduledResult = await this.dataSource.query<{ count: number }[]>(
      `
      SELECT COUNT(*) as count
      FROM session s
      JOIN booking b ON b.session_id = s.id
      WHERE s.teacher_id = ?
      AND s.deleted_at IS NULL
      AND b.status = 'CONFIRMED'
      AND s.status = 'SCHEDULED'
      AND s.start_at > NOW()
    `,
      [teacher.id],
    );
    const totalScheduled = Number(scheduledResult[0]?.count || 0);

    // Get active students count (students with at least one confirmed booking)
    const activeStudentsResult = await this.dataSource.query<
      { count: number }[]
    >(
      `
      SELECT COUNT(DISTINCT b.student_id) as count
      FROM booking b
      JOIN session s ON s.id = b.session_id
      WHERE s.teacher_id = ?
      AND s.deleted_at IS NULL
      AND b.status = 'CONFIRMED'
    `,
      [teacher.id],
    );
    const activeStudents = Number(activeStudentsResult[0]?.count || 0);

    return {
      nextSession,
      totalCompleted,
      totalScheduled,
      activeStudents,
    };
  }

  async getTeacherSessions(
    userId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const teacher = await this.teacherRepository.findOne({
      where: { userId },
    });

    if (!teacher) {
      return [];
    }

    let query = `
      SELECT
        s.id,
        s.type as class_type,
        s.start_at,
        s.end_at,
        s.status,
        b.student_id,
        s.meeting_url,
        concat(first_name,' ',last_name) as student_name
      FROM session s
      JOIN booking b ON b.session_id = s.id
      JOIN student st ON st.id = b.student_id
      JOIN user u ON u.id = st.user_id
      WHERE s.teacher_id = ?
      AND s.deleted_at IS NULL
      AND b.status = 'CONFIRMED'
      AND s.status = 'SCHEDULED'
    `;

    const params: (number | Date)[] = [teacher.id];

    if (startDate) {
      query += " AND s.start_at >= ?";
      params.push(new Date(startDate));
    }

    if (endDate) {
      query += " AND s.end_at <= ?";
      params.push(new Date(endDate));
    }

    query += " ORDER BY s.start_at ASC";

    const sessions = await this.dataSource.query<
      {
        id: number;
        class_type: string;
        start_at: Date;
        end_at: Date;
        status: string;
        student_id: number;
        course_id: number | null;
        meeting_url: string | null;
        student_name: string;
      }[]
    >(query, params);

    return sessions.map((session) => ({
      id: session.id,
      classType: session.class_type,
      startAt: new Date(session.start_at).toISOString(),
      endAt: new Date(session.end_at).toISOString(),
      status: session.status,
      studentId: session.student_id,
      studentName: session.student_name,
      meetingUrl: session.meeting_url,
    }));
  }
}
