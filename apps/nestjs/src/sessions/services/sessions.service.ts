import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { TeacherAvailabilityService } from "../../teachers/services/teacher-availability.service.js";
import { StudentAvailabilityService } from "../../students/services/student-availability.service.js";

@Injectable()
export class SessionsService {
  constructor(
    private teacherAvailabilityService: TeacherAvailabilityService,
    private studentAvailabilityService: StudentAvailabilityService,
  ) {}

  async validatePrivateSession({
    teacherId,
    startAt,
    endAt,
    studentId,
  }: {
    teacherId: number;
    startAt: string;
    endAt: string;
    studentId?: number;
  }) {
    try {
      // Validate teacher availability
      await this.teacherAvailabilityService.validateAvailability({
        teacherId,
        startAt,
        endAt,
        studentId,
      });

      // If studentId provided, also validate student availability
      if (studentId) {
        await this.studentAvailabilityService.validateStudentAvailability({
          studentId,
          startAt,
          endAt,
        });
      }

      return { teacherAvailable: true, studentAvailable: !!studentId };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.log("Error validating session:", error);
      throw new BadRequestException(
        "Failed to validate session due to a database error.",
      );
    }
  }
}
