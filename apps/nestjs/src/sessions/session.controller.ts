import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Session, SessionStatus } from "./entities/session.entity.js";
import { AdminGuard } from "../auth/admin.guard.js";

interface SessionResponse {
  id: number;
  type: string;
  startAt: Date;
  endAt: Date;
  teacherId: number;
  teacherName: string;
  meetingUrl: string | null;
  capacityMax: number;
  status: string;
  groupClass: {
    id: number;
    title: string;
    description: string | null;
  } | null;
}

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
  async getSessionById(@Param("id") id: string): Promise<SessionResponse> {
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

  /**
   * Update session (Admin only)
   * @param id The session ID
   * @param body Update data
   */
  @Patch(":id")
  @UseGuards(AdminGuard)
  async updateSession(
    @Param("id") id: string,
    @Body()
    body: Partial<{
      status: SessionStatus;
      startAt: Date;
      endAt: Date;
      meetingUrl: string;
    }>,
  ): Promise<SessionResponse> {
    const sessionId = parseInt(id, 10);
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    // Update the session
    await this.sessionsRepository.update(sessionId, body);

    // Return updated session
    return this.getSessionById(id);
  }

  /**
   * Delete session (Admin only)
   * @param id The session ID
   */
  @Delete(":id")
  @UseGuards(AdminGuard)
  async deleteSession(@Param("id") id: string): Promise<{ message: string }> {
    const sessionId = parseInt(id, 10);
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ["bookings"],
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    // Check if session has bookings
    if (session.bookings && session.bookings.length > 0) {
      throw new Error(
        "Cannot delete session with existing bookings. Cancel the session instead.",
      );
    }

    await this.sessionsRepository.delete(sessionId);

    return { message: "Session deleted successfully" };
  }
}
