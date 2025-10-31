import { Injectable, NotFoundException } from "@nestjs/common";
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
import { SessionWithEnrollment } from "./dto/session-with-enrollment.dto.js";
import {
  SessionWithEnrollmentResponse,
  CreateGroupClassDto,
  GroupClassListDto,
  PatchGroupClassDto,
} from "@thrive/shared";

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
        "session",
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

      // Check if the single session is upcoming
      let upcomingSessionsCount = 0;
      const session = gc.session;
      if (
        session &&
        session.status === SessionStatus.SCHEDULED &&
        new Date(session.startAt) > new Date()
      ) {
        upcomingSessionsCount = 1;
      }

      return {
        id: gc.id,
        title: gc.title,
        description: gc.description,
        capacityMax: gc.capacityMax,
        isActive: gc.isActive,
        levels: levelsMapped,
        teachers: teachersMapped,
        upcomingSessionsCount,
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
        "session",
        "session.bookings",
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

    // Check if the single session is upcoming
    let upcomingSessionsCount = 0;
    const session = gc.session;
    const sessionsMapped: Array<{
      id: number;
      startAt: Date;
      endAt: Date;
      status: string;
      enrolledCount: number;
      waitlistCount: number;
    }> = [];

    if (session) {
      if (
        session.status === SessionStatus.SCHEDULED &&
        new Date(session.startAt) > new Date()
      ) {
        upcomingSessionsCount = 1;
      }

      // Count bookings and waitlist
      const bookings =
        (session.bookings as Array<{ status: string }> | undefined) ?? [];
      const enrolledCount = bookings.filter(
        (b) => b.status === "CONFIRMED",
      ).length;
      const waitlistCount = bookings.filter(
        (b) => b.status === "WAITLISTED",
      ).length;

      sessionsMapped.push({
        id: session.id,
        startAt: session.startAt,
        endAt: session.endAt,
        status: session.status,
        enrolledCount,
        waitlistCount,
      });
    }

    return {
      id: gc.id,
      title: gc.title,
      description: gc.description,
      capacityMax: gc.capacityMax,
      isActive: gc.isActive,
      levels: levelsMapped,
      teachers: teachersMapped,
      upcomingSessionsCount: upcomingSessionsCount || 0,
      sessions: sessionsMapped,
    } as GroupClassListDto;
  }

  /**
   * Create group class(es) with single session each
   * When rrule is provided, creates multiple GroupClass records (one per occurrence)
   * When one-off sessions are provided, creates one GroupClass per session
   */
  async createGroupClass(
    dto: CreateGroupClassDto,
  ): Promise<GroupClass | GroupClass[]> {
    // Helper to create levels and teachers for a GroupClass
    const createLevelsAndTeachers = async (groupClassId: number) => {
      // Create group_class_level records
      if (dto.levelIds && dto.levelIds.length > 0) {
        const groupClassLevels = dto.levelIds.map((levelId) =>
          this.groupClassLevelRepository.create({
            groupClassId,
            levelId,
          }),
        );
        await this.groupClassLevelRepository.save(groupClassLevels);
      }

      // Create group_class_teacher records
      if (dto.teacherIds && dto.teacherIds.length > 0) {
        const groupClassTeachers = dto.teacherIds.map((teacherId) =>
          this.groupClassTeacherRepository.create({
            groupClassId,
            teacherId,
            isPrimary:
              dto.primaryTeacherId !== undefined &&
              teacherId === dto.primaryTeacherId,
          }),
        );
        await this.groupClassTeacherRepository.save(groupClassTeachers);
      }
    };

    // Helper to create a single session for a GroupClass
    const createSession = async (
      groupClassId: number,
      startAt: Date,
      endAt: Date,
    ) => {
      const session = this.sessionsRepository.create({
        type: ServiceType.GROUP,
        groupClassId,
        startAt,
        endAt,
        capacityMax: dto.capacityMax || 6,
        status: SessionStatus.SCHEDULED,
        visibility: SessionVisibility.PUBLIC,
        teacherId: dto.primaryTeacherId || dto.teacherIds[0],
      });
      return this.sessionsRepository.save(session);
    };

    // Case 1: Recurring schedule (rrule provided)
    if (dto.rrule && dto.startDate && dto.endDate) {
      const rule = RRule.fromString(dto.rrule);
      const dates = rule.all();

      // Extract time and duration from dto if provided
      const sessionDuration = dto.sessionDuration || 60; // default 60 minutes

      const createdGroupClasses: GroupClass[] = [];

      for (const date of dates) {
        // Combine date with session time if provided
        let startAt: Date;
        if (dto.sessionStartTime) {
          const [hours, minutes] = dto.sessionStartTime.split(":").map(Number);
          startAt = new Date(date);
          startAt.setHours(hours, minutes, 0, 0);
        } else {
          startAt = date;
        }

        const endAt = new Date(startAt.getTime() + sessionDuration * 60000);

        // Create GroupClass
        const groupClass = this.groupClassesRepository.create({
          title: dto.title,
          description: dto.description || null,
          capacityMax: dto.capacityMax || 6,
          isActive: true,
        });

        const savedGroupClass =
          await this.groupClassesRepository.save(groupClass);

        // Create relations
        await createLevelsAndTeachers(savedGroupClass.id);

        // Create the single session for this GroupClass
        await createSession(savedGroupClass.id, startAt, endAt);

        createdGroupClasses.push(savedGroupClass);
      }

      return createdGroupClasses;
    }

    // Case 2: One-off session(s)
    if (dto.sessions && dto.sessions.length > 0) {
      const createdGroupClasses: GroupClass[] = [];

      for (const sessionDto of dto.sessions) {
        // Create GroupClass
        const groupClass = this.groupClassesRepository.create({
          title: dto.title,
          description: dto.description || null,
          capacityMax: dto.capacityMax || 6,
          isActive: true,
        });

        const savedGroupClass =
          await this.groupClassesRepository.save(groupClass);

        // Create relations
        await createLevelsAndTeachers(savedGroupClass.id);

        // Create the single session for this GroupClass
        await createSession(
          savedGroupClass.id,
          new Date(sessionDto.startAt),
          new Date(sessionDto.endAt),
        );

        createdGroupClasses.push(savedGroupClass);
      }

      // Return single item if only one session, otherwise return array
      return createdGroupClasses.length === 1
        ? createdGroupClasses[0]
        : createdGroupClasses;
    }

    // Case 3: No sessions defined - create empty GroupClass (shouldn't happen normally)
    const groupClass = this.groupClassesRepository.create({
      title: dto.title,
      description: dto.description || null,
      capacityMax: dto.capacityMax || 6,
      isActive: true,
    });

    const savedGroupClass = await this.groupClassesRepository.save(groupClass);
    await createLevelsAndTeachers(savedGroupClass.id);

    return savedGroupClass;
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
      // .leftJoinAndSelect("teacher.birthplace", "birthplace")
      // .leftJoinAndSelect("teacher.current_location", "current_location")
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
                level: session.groupClass.groupClassLevels?.[0]?.level ?? null,
              }
            : null,
          enrolledCount: session.enrolledCount,
          availableSpots: session.capacityMax - session.enrolledCount,
          isFull: session.enrolledCount >= session.capacityMax,
          canJoinWaitlist: session.enrolledCount >= session.capacityMax,
          teacher: session.teacher.toPublicDto(),
        }) as SessionWithEnrollmentResponse,
    );
  }

  async updateGroupClass(
    id: number,
    dto: PatchGroupClassDto,
  ): Promise<GroupClass> {
    const existing = await this.groupClassesRepository.findOne({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`GroupClass with id ${id} not found`);
    }
    return this.groupClassesRepository.save(
      this.groupClassesRepository.merge(existing, {
        ...existing,
        ...dto,
      } as GroupClass),
    );
  }
}
