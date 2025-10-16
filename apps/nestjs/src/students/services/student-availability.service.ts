import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Student } from "../entities/student.entity.js";
import {
  Booking,
  BookingStatus,
} from "../../payments/entities/booking.entity.js";
import {
  Session,
  SessionStatus,
} from "../../sessions/entities/session.entity.js";

@Injectable()
export class StudentAvailabilityService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

  /**
   * Validates that a student is available for a given time slot
   * Checks for conflicting bookings/sessions
   */
  async validateStudentAvailability({
    studentId,
    startAt,
    endAt,
  }: {
    studentId: number;
    startAt: string;
    endAt: string;
  }): Promise<void> {
    // Check if student exists
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new BadRequestException(`Student ${studentId} not found`);
    }

    // Check for conflicting bookings
    const conflictingBookings = await this.bookingRepository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.session", "session")
      .where("booking.studentId = :studentId", { studentId })
      .andWhere("booking.status IN (:...statuses)", {
        statuses: [
          BookingStatus.CONFIRMED,
          BookingStatus.INVITED,
          BookingStatus.PENDING,
        ],
      })
      .andWhere("session.status = :sessionStatus", {
        sessionStatus: SessionStatus.SCHEDULED,
      })
      .andWhere("(session.startAt < :endAt AND session.endAt > :startAt)", {
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      })
      .getMany();

    if (conflictingBookings.length > 0) {
      const conflict = conflictingBookings[0];
      throw new BadRequestException(
        `Student is already booked for a session from ${conflict.session.startAt.toISOString()} to ${conflict.session.endAt.toISOString()}`,
      );
    }
  }

  /**
   * Gets all bookings for a student within a date range
   * Useful for calendar views and availability checking
   */
  async getStudentBookingsInRange({
    studentId,
    startDate,
    endDate,
  }: {
    studentId: number;
    startDate: Date;
    endDate: Date;
  }): Promise<Booking[]> {
    return await this.bookingRepository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.session", "session")
      .leftJoinAndSelect("session.teacher", "teacher")
      .leftJoinAndSelect("teacher.user", "teacherUser")
      .where("booking.studentId = :studentId", { studentId })
      .andWhere("session.startAt >= :startDate", { startDate })
      .andWhere("session.startAt <= :endDate", { endDate })
      .andWhere("booking.status IN (:...statuses)", {
        statuses: [
          BookingStatus.CONFIRMED,
          BookingStatus.INVITED,
          BookingStatus.PENDING,
        ],
      })
      .andWhere("session.status = :sessionStatus", {
        sessionStatus: SessionStatus.SCHEDULED,
      })
      .orderBy("session.startAt", "ASC")
      .getMany();
  }
}
