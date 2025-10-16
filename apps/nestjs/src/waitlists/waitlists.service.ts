import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Waitlist } from "./entities/waitlist.entity.js";
import { Session } from "../sessions/entities/session.entity.js";
import { Booking, BookingStatus } from "../payments/entities/booking.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";

@Injectable()
export class WaitlistsService {
  constructor(
    @InjectRepository(Waitlist)
    private readonly waitlistRepository: Repository<Waitlist>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async joinWaitlist(sessionId: number, studentId: number): Promise<Waitlist> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException("Session not found");
    }

    const enrolledCount = await this.bookingRepository.count({
      where: { sessionId, status: BookingStatus.CONFIRMED },
    });
    if (enrolledCount < session.capacityMax) {
      throw new BadRequestException("Session is not full");
    }

    const existingEntry = await this.waitlistRepository.findOne({
      where: { sessionId, studentId },
    });
    if (existingEntry) {
      return existingEntry;
    }

    const maxPosition = await this.waitlistRepository
      .createQueryBuilder("waitlist")
      .select("MAX(waitlist.position)", "maxPosition")
      .where("waitlist.sessionId = :sessionId", { sessionId })
      .getRawOne();

    const newPosition = (maxPosition.maxPosition || 0) + 1;

    const waitlistEntry = this.waitlistRepository.create({
      sessionId,
      studentId,
      position: newPosition,
    });

    return this.waitlistRepository.save(waitlistEntry);
  }

  async leaveWaitlist(waitlistId: number, studentId: number): Promise<void> {
    const entry = await this.waitlistRepository.findOne({
      where: { id: waitlistId, studentId },
    });
    if (!entry) {
      throw new NotFoundException("Waitlist entry not found");
    }

    await this.waitlistRepository.delete(waitlistId);

    // Reorder remaining entries
    await this.waitlistRepository
      .createQueryBuilder()
      .update(Waitlist)
      .set({ position: () => "position - 1" })
      .where("sessionId = :sessionId AND position > :position", {
        sessionId: entry.sessionId,
        position: entry.position,
      })
      .execute();
  }

  async getWaitlistForSession(sessionId: number): Promise<Waitlist[]> {
    return this.waitlistRepository.find({
      where: { sessionId },
      order: { position: "ASC" },
      relations: ["student", "student.user"],
    });
  }

  async getMyWaitlists(studentId: number): Promise<Waitlist[]> {
    return this.waitlistRepository.find({
      where: { studentId },
      order: { createdAt: "DESC" },
      relations: [
        "session",
        "session.groupClass",
        "session.groupClass.groupClassLevels",
        "session.groupClass.groupClassLevels.level",
      ],
    });
  }

  async handleBookingCancellation(sessionId: number): Promise<void> {
    const waitlist = await this.getWaitlistForSession(sessionId);
    if (waitlist.length > 0) {
      const firstInLine = waitlist.find((w) => w.position === 1);
      if (firstInLine) {
        await this.notifyWaitlistMember(firstInLine.id);
      }
    }
  }

  async notifyWaitlistMember(
    waitlistId: number,
    expiresInHours = 24,
  ): Promise<void> {
    const waitlistEntry = await this.waitlistRepository.findOne({
      where: { id: waitlistId },
    });
    if (!waitlistEntry) {
      throw new NotFoundException("Waitlist entry not found");
    }

    waitlistEntry.notifiedAt = new Date();
    waitlistEntry.notificationExpiresAt = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1000,
    );

    // In a real app, you'd send an email/notification here
    console.log(
      `Notifying student ${waitlistEntry.studentId} about opening in session ${waitlistEntry.sessionId}`,
    );

    await this.waitlistRepository.save(waitlistEntry);
  }

  async promoteToBooking(
    waitlistId: number,
    studentPackageId?: number,
  ): Promise<Booking> {
    const waitlistEntry = await this.waitlistRepository.findOne({
      where: { id: waitlistId },
      relations: ["session", "student"],
    });

    if (!waitlistEntry) {
      throw new NotFoundException("Waitlist entry not found");
    }

    const { session, student } = waitlistEntry;

    const enrolledCount = await this.bookingRepository.count({
      where: { sessionId: session.id, status: BookingStatus.CONFIRMED },
    });

    if (enrolledCount >= session.capacityMax) {
      throw new BadRequestException("Session is still full");
    }

    const usedPackage: StudentPackage | null = null;
    if (studentPackageId) {
      // This part needs access to StudentPackage repository, which should be added
      // For now, this logic is simplified
    }

    const booking = new Booking();
    booking.sessionId = session.id;
    booking.studentId = student.id;
    booking.status = BookingStatus.CONFIRMED;
    booking.studentPackageId = studentPackageId || null;

    const savedBooking = await this.bookingRepository.save(booking);

    await this.waitlistRepository.delete(waitlistId);

    // Reorder remaining entries
    await this.waitlistRepository
      .createQueryBuilder()
      .update(Waitlist)
      .set({ position: () => "position - 1" })
      .where("sessionId = :sessionId AND position > :position", {
        sessionId: waitlistEntry.sessionId,
        position: waitlistEntry.position,
      })
      .execute();

    return savedBooking;
  }
}
