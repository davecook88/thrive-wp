import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TeacherAvailabilityService } from '../../teachers/services/teacher-availability.service.js';

@Injectable()
export class SessionsService {
  constructor(private teacherAvailabilityService: TeacherAvailabilityService) {}

  async validatePrivateSession({
    teacherId,
    startAt,
    endAt,
  }: {
    teacherId: number;
    startAt: string;
    endAt: string;
  }) {
    try {
      return await this.teacherAvailabilityService.validateAvailability({
        teacherId,
        startAt,
        endAt,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to validate session due to a database error.',
      );
    }
  }
}
