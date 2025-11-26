import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Student } from "../entities/student.entity.js";
import { Session } from "../../sessions/entities/session.entity.js";
import { DashboardSummaryDto } from "@thrive/shared";
import { StudentsService } from "../students.service.js";

@Injectable()
export class StudentDashboardService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly studentsService: StudentsService,
  ) {}

  async getDashboardSummary(userId: number): Promise<DashboardSummaryDto> {
    const student = await this.studentsService.findByUserId(userId);
    if (!student) {
      throw new Error("Student not found");
    }

    const upcomingSessions = await this.studentsService.getUpcomingSessions(
      userId,
      1,
    );
    const nextSession = upcomingSessions[0]
      ? {
          id: Number(upcomingSessions[0].id),
          startAt: String(upcomingSessions[0].startAt || ""), // Already ISO string
          isStartingSoon:
            new Date(String(upcomingSessions[0].startAt || "")).getTime() -
              Date.now() <
            30 * 60 * 1000, // 30 mins
          joinUrl: upcomingSessions[0].meetingUrl || undefined,
        }
      : null;

    // Placeholder for active course logic - to be implemented with real course data
    const activeCourse = {
      name: "General English",
      progress: 0,
      totalClasses: 0,
      completedClasses: 0,
    };

    // Calculate credit balance (sum of all active package allowances)
    // This is a simplified calculation. Real logic might need to be more specific.
    const creditBalance = 0; // TODO: Fetch from package service

    let recommendedAction: DashboardSummaryDto["recommendedAction"] =
      "BOOK_SESSION";

    if (nextSession && nextSession.isStartingSoon) {
      recommendedAction = "JOIN_CLASS";
    } else if (creditBalance === 0) {
      recommendedAction = "BUY_CREDITS";
    }

    return {
      studentName: student.user.firstName,
      avatarUrl: student.user.avatarUrl,
      nextSession,
      activeCourse: null, // Set to null for now as we don't have course progress logic yet
      creditBalance,
      recommendedAction,
    };
  }
}
