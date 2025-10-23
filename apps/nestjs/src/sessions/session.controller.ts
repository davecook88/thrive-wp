import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Session } from "./entities/session.entity.js";
import { GroupClass } from "../group-classes/entities/group-class.entity.js";

@Controller("sessions")
export class SessionController {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
  ) {}

  /**
   * Get session by ID
   * @param id The session ID
   * @returns The session data with related entities
   */
  @Get(":id")
  async getSessionById(@Param("id") id: string): Promise<any> {
    const session = await this.sessionsRepository.findOne({
      where: { id: parseInt(id, 10) },
      relations: ["teacher", "teacher.user", "groupClass"],
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    // Format the teacher name
    const teacherUser = session.teacher?.user;
    const teacherName = teacherUser
      ? `${teacherUser.firstName ?? ""} ${teacherUser.lastName ?? ""}`.trim()
      : "";

    // Format the response
    return {
      id: session.id,
      type: session.type,
      startAt: session.startAt,
      endAt: session.endAt,
      teacherId: session.teacherId,
      teacherName,
      meetingUrl: session.meetingUrl,
      capacityMax: session.capacityMax,
      status: session.status,
      groupClass: session.groupClass
        ? {
            id: session.groupClass.id,
            title: session.groupClass.title,
            description: session.groupClass.description,
          }
        : null,
    };
  }
}
