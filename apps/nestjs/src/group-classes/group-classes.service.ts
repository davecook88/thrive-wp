import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GroupClass } from "./entities/group-class.entity.js";
import { GroupClassLevel } from "./entities/group-class-level.entity.js";
import { GroupClassTeacher } from "./entities/group-class-teacher.entity.js";
import rruleModule from "rrule";
const { RRule } = rruleModule;
import {
  Session,
  SessionStatus,
  SessionVisibility,
} from "../sessions/entities/session.entity.js";
import { ServiceType } from "../common/types/class-types.js";
import {
  SessionWithEnrollment,
  SessionWithEnrollmentResponse,
} from "./dto/session-with-enrollment.dto.js";
import { PublicTeacherDto } from "@thrive/shared";
import { CreateGroupClassDto } from "./dto/create-group-class.dto.js";
import { GroupClassListDto } from "./dto/group-class-list.dto.js";
import { AvailableSession } from "@thrive/shared";

@Injectable()
export class GroupClassesService {
  constructor(
    @InjectRepository(GroupClass)
    private groupClassesRepository: Repository<GroupClass>,
    @InjectRepository(GroupClassLevel)
    private groupClassLevelRepository: Repository<GroupClassLevel>,
    @InjectRepository(GroupClassTeacher)
    private groupClassTeacherRepository: Repository<GroupClassTeacher>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
  ) {}

  async findAll(): Promise<GroupClassListDto[]> {
    const groupClasses = await this.groupClassesRepository.find({
      relations: [
        "groupClassLevels",
        "groupClassLevels.level",
        "groupClassTeachers",
        "groupClassTeachers.teacher",
        "groupClassTeachers.teacher.user",
        "sessions",
      ],
    });

    // Transform to match Vue component's expected format
    return groupClasses.map((gc) => {
      // Explicitly type relation arrays to satisfy the linter
      const levelsMapped: { id: number; code: string; name: string }[] = [];
      const levelsArr = gc.groupClassLevels ?? [];
      for (const gcl of levelsArr) {
        if (gcl && gcl.level) {
          const lvl = gcl.level as unknown as {
            id: number;
            code: string;
            name: string;
          };
          levelsMapped.push({ id: lvl.id, code: lvl.code, name: lvl.name });
        }
      }

      const teachersMapped: {
        teacherId: number;
        userId: number;
        name: string;
        isPrimary: boolean;
      }[] = [];
      const teachersArr = gc.groupClassTeachers ?? [];
      for (const gct of teachersArr) {
        const teacher = gct.teacher as unknown as
          | {
              userId?: number;
              user?: { firstName?: string; lastName?: string };
            }
          | undefined;
        const name = teacher?.user
          ? `${teacher.user.firstName ?? ""} ${teacher.user.lastName ?? ""}`.trim()
          : "Teacher";
        teachersMapped.push({
          teacherId: gct.teacherId,
          userId: teacher?.userId ?? 0,
          name: name || "Teacher",
          isPrimary: gct.isPrimary,
        });
      }

      let upcomingSessionsCount = 0;
      const sessionsArr = gc.sessions ?? [];
      for (const s of sessionsArr) {
        if (
          s.status === SessionStatus.SCHEDULED &&
          new Date(s.startAt) > new Date()
        ) {
          upcomingSessionsCount += 1;
        }
      }

      return {
        id: gc.id,
        title: gc.title,
        description: gc.description,
        capacityMax: gc.capacityMax,
        rrule: gc.rrule,
        startDate: gc.startDate,
        endDate: gc.endDate,
        isActive: gc.isActive,
        levels: levelsMapped,
        teachers: teachersMapped,
        upcomingSessionsCount: upcomingSessionsCount || 0,
      } as GroupClassListDto;
    });
  }

  async findOne(id: number): Promise<GroupClassListDto | null> {
    const gc = await this.groupClassesRepository.findOne({
      where: { id },
      relations: [
        "groupClassLevels",
        "groupClassLevels.level",
        "groupClassTeachers",
        "groupClassTeachers.teacher",
        "groupClassTeachers.teacher.user",
        "sessions",
        "sessions.bookings",
      ],
    });

    if (!gc) {
      return null;
    }

    // Transform to match Vue component's expected format (same as findAll)
    const levelsMapped: { id: number; code: string; name: string }[] = [];
    const levelsArr = gc.groupClassLevels ?? [];
    for (const gcl of levelsArr) {
      if (gcl && gcl.level) {
        const lvl = gcl.level as unknown as {
          id: number;
          code: string;
          name: string;
        };
        levelsMapped.push({ id: lvl.id, code: lvl.code, name: lvl.name });
      }
    }

    const teachersMapped: {
      teacherId: number;
      userId: number;
      name: string;
      isPrimary: boolean;
    }[] = [];
    const teachersArr = gc.groupClassTeachers ?? [];
    for (const gct of teachersArr) {
      const teacher = gct.teacher as unknown as
        | {
            userId?: number;
            user?: { firstName?: string; lastName?: string };
          }
        | undefined;
      const name = teacher?.user
        ? `${teacher.user.firstName ?? ""} ${teacher.user.lastName ?? ""}`.trim()
        : "Teacher";
      teachersMapped.push({
        teacherId: gct.teacherId,
        userId: teacher?.userId ?? 0,
        name: name || "Teacher",
        isPrimary: gct.isPrimary,
      });
    }

    let upcomingSessionsCount = 0;
    const sessionsArr = gc.sessions ?? [];
    const sessionsMapped: Array<{
      id: number;
      startAt: Date;
      endAt: Date;
      status: string;
      enrolledCount: number;
      waitlistCount: number;
    }> = [];

    for (const s of sessionsArr) {
      if (
        s.status === SessionStatus.SCHEDULED &&
        new Date(s.startAt) > new Date()
      ) {
        upcomingSessionsCount += 1;
      }

      // Count bookings and waitlist
      const bookings =
        (s.bookings as Array<{ status: string }> | undefined) ?? [];
      const enrolledCount = bookings.filter(
        (b) => b.status === "CONFIRMED",
      ).length;
      const waitlistCount = bookings.filter(
        (b) => b.status === "WAITLISTED",
      ).length;

      sessionsMapped.push({
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
        status: s.status,
        enrolledCount,
        waitlistCount,
      });
    }

    return {
      id: gc.id,
      title: gc.title,
      description: gc.description,
      capacityMax: gc.capacityMax,
      rrule: gc.rrule,
      startDate: gc.startDate,
      endDate: gc.endDate,
      isActive: gc.isActive,
      levels: levelsMapped,
      teachers: teachersMapped,
      upcomingSessionsCount: upcomingSessionsCount || 0,
      sessions: sessionsMapped,
    } as GroupClassListDto;
  }

  /**
   * Create a new group class with levels, teachers, and optional sessions
   */
  async createGroupClass(dto: CreateGroupClassDto): Promise<GroupClass> {
    // Create the group class record
    const groupClass = this.groupClassesRepository.create({
      title: dto.title,
      description: dto.description || null,
      capacityMax: dto.capacityMax || 6,
      rrule: dto.rrule || null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isActive: true,
    });

    const savedGroupClass = await this.groupClassesRepository.save(groupClass);

    // Create group_class_level records
    if (dto.levelIds && dto.levelIds.length > 0) {
      const groupClassLevels = dto.levelIds.map((levelId) =>
        this.groupClassLevelRepository.create({
          groupClassId: savedGroupClass.id,
          levelId,
        }),
      );
      await this.groupClassLevelRepository.save(groupClassLevels);
    }

    // Create group_class_teacher records
    if (dto.teacherIds && dto.teacherIds.length > 0) {
      const groupClassTeachers = dto.teacherIds.map((teacherId) =>
        this.groupClassTeacherRepository.create({
          groupClassId: savedGroupClass.id,
          teacherId,
          isPrimary:
            dto.primaryTeacherId !== undefined &&
            teacherId === dto.primaryTeacherId,
        }),
      );
      await this.groupClassTeacherRepository.save(groupClassTeachers);
    }

    // If one-off sessions are provided, create them
    if (dto.sessions && dto.sessions.length > 0) {
      const sessions = dto.sessions.map((sessionDto) => {
        const session = this.sessionsRepository.create({
          type: ServiceType.GROUP,
          groupClassId: savedGroupClass.id,
          startAt: new Date(sessionDto.startAt),
          endAt: new Date(sessionDto.endAt),
          capacityMax: savedGroupClass.capacityMax,
          status: SessionStatus.SCHEDULED,
          visibility: SessionVisibility.PUBLIC,
          // Note: teacherId should be set from the primary teacher if available
          teacherId: dto.primaryTeacherId || dto.teacherIds[0],
        });
        return session;
      });
      await this.sessionsRepository.save(sessions);
    }

    // If recurring (rrule provided), optionally generate initial sessions
    // This could be done here or via the separate generate-sessions endpoint
    // For now, leaving it to the explicit generate-sessions call

    // Return the created group class with relations
    return this.groupClassesRepository.findOne({
      where: { id: savedGroupClass.id },
      relations: ["groupClassLevels", "groupClassTeachers"],
    }) as Promise<GroupClass>;
  }

  async generateSessions(groupClassId: number): Promise<Session[]> {
    const groupClass = await this.groupClassesRepository.findOne({
      where: { id: groupClassId },
      relations: ["groupClassTeachers"],
    });
    if (!groupClass || !groupClass.rrule) {
      return [];
    }

    // Find the primary teacher or use the first teacher
    const primaryTeacher = groupClass.groupClassTeachers?.find(
      (gct) => gct.isPrimary,
    );
    const teacherId =
      primaryTeacher?.teacherId ||
      groupClass.groupClassTeachers?.[0]?.teacherId;

    if (!teacherId) {
      throw new Error(
        `No teacher assigned to group class ${groupClassId}. Cannot generate sessions.`,
      );
    }

    const rule = RRule.fromString(groupClass.rrule);
    const dates = rule.all();

    const sessions: Session[] = [];
    for (const date of dates) {
      const session = new Session();
      session.type = ServiceType.GROUP;
      session.groupClassId = groupClass.id;
      session.teacherId = teacherId;
      session.startAt = date;
      session.endAt = new Date(date.getTime() + 3600 * 1000); // Assuming 1 hour duration
      session.capacityMax = groupClass.capacityMax;
      session.status = SessionStatus.SCHEDULED;
      session.visibility = SessionVisibility.PUBLIC;
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
      .createQueryBuilder("session")
      .leftJoinAndSelect("session.groupClass", "groupClass")
      .leftJoinAndSelect("groupClass.groupClassLevels", "groupClassLevels")
      .leftJoinAndSelect("groupClassLevels.level", "level")
      .leftJoinAndSelect("session.teacher", "teacher")
      .leftJoinAndSelect("teacher.user", "user")
      .loadRelationCountAndMap("session.enrolledCount", "session.bookings")
      .where("session.type = :type", { type: ServiceType.GROUP })
      .andWhere("groupClass.isActive = true")
      .andWhere("session.status = :status", { status: "SCHEDULED" });

    if (filters.startDate) {
      qb.andWhere("session.startAt >= :startDate", {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      qb.andWhere("session.startAt <= :endDate", { endDate: filters.endDate });
    }

    if (filters.levelId) {
      qb.andWhere("level.id = :levelId", {
        levelId: filters.levelId,
      });
    }

    if (filters.teacherId) {
      qb.andWhere("session.teacherId = :teacherId", {
        teacherId: filters.teacherId,
      });
    }

    // Cast to SessionWithEnrollment because loadRelationCountAndMap adds enrolledCount at runtime
    const sessions = (await qb.getMany()) as SessionWithEnrollment[];

    return sessions.map(
      (session) =>
        ({
          id: session.id,
          type: session.type,
          startAt: session.startAt.toISOString(),
          endAt: session.endAt.toISOString(),
          capacityMax: session.capacityMax,
          status: session.status,
          meetingUrl: session.meetingUrl || null,
          teacherId: session.teacherId,
          groupClassId: session.groupClassId || null,
          groupClass: session.groupClass
            ? {
                id: session.groupClass.id,
                title: session.groupClass.title,
                level: (session.groupClass.groupClassLevels?.[0]?.level ??
                  null) as any,
              }
            : null,
          enrolledCount: session.enrolledCount,
          availableSpots: session.capacityMax - session.enrolledCount,
          isFull: session.enrolledCount >= session.capacityMax,
          canJoinWaitlist: session.enrolledCount >= session.capacityMax,
          teacher: session.teacher
            ? ({
                id: session.teacher.id,
                userId: session.teacher.userId,
                displayName:
                  `${session.teacher.user?.firstName || ""} ${session.teacher.user?.lastName || ""}`.trim() ||
                  "Teacher",
                bio: session.teacher.bio || null,
                avatarUrl: session.teacher.avatarUrl || null,
                isActive: session.teacher.isActive,
                initials:
                  (session.teacher.user?.firstName?.[0] || "T") +
                  (session.teacher.user?.lastName?.[0] || ""),
              } as PublicTeacherDto)
            : null,
        }) as SessionWithEnrollmentResponse,
    );
  }
}
