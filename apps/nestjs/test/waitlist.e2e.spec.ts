import { describe, beforeEach, afterEach, it, expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request, { Response } from "supertest";
import jwt from "jsonwebtoken";
import type { Application } from "express";
import { AppModule } from "../src/app.module.js";
import { DataSource, Repository } from "typeorm";
import { resetDatabase } from "./utils/reset-db.js";
import { User } from "../src/users/entities/user.entity.js";
import { Student } from "../src/students/entities/student.entity.js";
import { Teacher } from "../src/teachers/entities/teacher.entity.js";
import { GroupClass } from "../src/group-classes/entities/group-class.entity.js";
import {
  Booking,
  BookingStatus,
} from "../src/payments/entities/booking.entity.js";
import { Level } from "../src/levels/entities/level.entity.js";
import { Session } from "../src/sessions/entities/session.entity.js";
import { Waitlist } from "../src/waitlists/entities/waitlist.entity.js";
import { ServiceType } from "@/common/types/class-types.js";
import {
  CancellationPolicy,
  PenaltyType,
} from "@/policies/entities/cancellation-policy.entity.js";

describe("Waitlist (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let studentRepository: Repository<Student>;
  let teacherRepository: Repository<Teacher>;
  let groupClassRepository: Repository<GroupClass>;
  let bookingRepository: Repository<Booking>;
  let levelRepository: Repository<Level>;
  let sessionRepository: Repository<Session>;
  let waitlistRepository: Repository<Waitlist>;
  let cancellationPolicyRepository: Repository<CancellationPolicy>;

  let testUser: User;
  let testStudent: Student;
  let testTeacher: Teacher;
  let testLevel: Level;
  let testSession: Session;

  type WaitlistResponse = {
    id: number;
    sessionId: number;
    studentId: number;
    position: number;
    notifiedAt?: string | null;
    notificationExpiresAt?: string | null;
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    await resetDatabase(dataSource);

    userRepository = dataSource.getRepository(User);
    studentRepository = dataSource.getRepository(Student);
    teacherRepository = dataSource.getRepository(Teacher);
    groupClassRepository = dataSource.getRepository(GroupClass);
    bookingRepository = dataSource.getRepository(Booking);
    levelRepository = dataSource.getRepository(Level);
    sessionRepository = dataSource.getRepository(Session);
    waitlistRepository = dataSource.getRepository(Waitlist);
    cancellationPolicyRepository = dataSource.getRepository(CancellationPolicy);

    await setupTestData();
  });

  afterEach(async () => {
    await app.close();
  });

  async function setupTestData(): Promise<void> {
    // Ensure there is an active cancellation policy for tests
    const existingPolicy = await cancellationPolicyRepository.findOne({
      where: { isActive: true },
    });
    if (!existingPolicy) {
      await cancellationPolicyRepository.save({
        allowCancellation: true,
        cancellationDeadlineHours: 1,
        allowRescheduling: true,
        reschedulingDeadlineHours: 1,
        maxReschedulesPerBooking: 2,
        penaltyType: PenaltyType.NONE,
        refundCreditsOnCancel: true,
        isActive: true,
        policyName: "test-default",
      });
    }
    const teacherUser = await userRepository.save({
      email: "teacher@test.com",
      firstName: "Test",
      lastName: "Teacher",
      passwordHash: "hash",
    });
    testTeacher = await teacherRepository.save({
      userId: teacherUser.id,
      bio: "I teach things.",
      tier: 1,
    });
    const foundLevel = await levelRepository.findOne({
      where: { code: "A1" },
    });
    // If migrations/seed were truncated by resetDatabase, ensure the test level exists
    if (foundLevel) {
      testLevel = foundLevel;
    } else {
      const newLevel = levelRepository.create({
        code: "A1",
        name: "Beginner A1",
        description: "Test level A1",
        sortOrder: 10,
        isActive: true,
      });
      testLevel = await levelRepository.save(newLevel);
    }

    // Use a future date for sessions so cancellation deadlines are relative to "now"
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    const futureDateISO = futureDate.toISOString();
    const futureDateOnly = futureDateISO.slice(0, 10); // YYYY-MM-DD
    const sessionStartAt = new Date(`${futureDateOnly}T12:00:00Z`);
    const sessionEndAt = new Date(sessionStartAt.getTime() + 60 * 60 * 1000);

    const groupClass = await groupClassRepository.save({
      title: "Full Class for Waitlist",
      levelId: testLevel.id,
      capacityMax: 1,
      teacherIds: [testTeacher.id],
      primaryTeacherId: testTeacher.id,
      rrule: "FREQ=WEEKLY;COUNT=1;BYDAY=WE",
      startDate: futureDateOnly,
      sessionStartTime: "12:00",
      sessionDuration: 60,
    });

    const savedSession = (await sessionRepository.save(
      sessionRepository.create({
        type: ServiceType.GROUP,
        groupClassId: groupClass.id,
        teacherId: testTeacher.id,
        startAt: sessionStartAt,
        endAt: sessionEndAt,
        capacityMax: 1,
      }),
    )) as Session | Session[];
    testSession = Array.isArray(savedSession) ? savedSession[0] : savedSession;

    // Create a student to fill the class
    const user1 = await userRepository.save({
      email: "student1@test.com",
      firstName: "First",
      lastName: "Student",
      passwordHash: "hash",
    });
    let student1 = await studentRepository.findOne({
      where: { userId: user1.id },
    });
    if (!student1) {
      student1 = await studentRepository.save({ userId: user1.id });
    }
    await bookingRepository.save({
      sessionId: testSession.id,
      studentId: student1.id,
      status: BookingStatus.CONFIRMED,
    });

    // Create a student to be on the waitlist
    testUser = await userRepository.save({
      email: "student2@test.com",
      firstName: "Second",
      lastName: "Student",
      passwordHash: "hash",
    });
    const existing = await studentRepository.findOne({
      where: { userId: testUser.id },
    });
    if (!existing) {
      testStudent = await studentRepository.save(
        studentRepository.create({ userId: testUser.id }),
      );
    } else {
      testStudent = existing;
    }
  }

  it("should allow a student to join a waitlist for a full group class session", async () => {
    const server = app.getHttpServer() as unknown as Application;
    const response: Response = await request(server)
      .post("/waitlists")
      .send({ sessionId: testSession.id, studentId: testStudent.id })
      .expect(201);

    const body = response.body as WaitlistResponse;
    expect(body.sessionId).toBe(testSession.id);
    expect(body.studentId).toBe(testStudent.id);
    expect(body.position).toBe(1);
  });

  it("should not allow a student to join a waitlist for a session that is not full", async () => {
    const groupClass = await groupClassRepository.save({
      title: "Not Full Class",
      levelId: testLevel.id,
      capacityMax: 2,
    });
    const notFullSession = await sessionRepository.save({
      type: ServiceType.GROUP,
      groupClassId: groupClass.id,
      teacherId: testTeacher.id,
      startAt: new Date("2025-01-09T12:00:00Z"),
      endAt: new Date("2025-01-09T13:00:00Z"),
      capacityMax: 2,
    });

    await request(app.getHttpServer() as unknown as Application)
      .post("/waitlists")
      .send({ sessionId: notFullSession.id, studentId: testStudent.id })
      .expect(400);
  });

  it("when a booking is cancelled, the first student on the waitlist is notified", async () => {
    // Student 2 joins the waitlist
    await request(app.getHttpServer() as unknown as Application)
      .post("/waitlists")
      .send({ sessionId: testSession.id, studentId: testStudent.id })
      .expect(201);

    // Student 1 (the one with the booking) cancels
    const booking = await bookingRepository.findOne({
      where: { sessionId: testSession.id },
    });
    expect(booking).not.toBeNull();
    if (!booking)
      throw new Error("Expected booking to exist for cancellation test");
    // Sanity checks to avoid confusing 404 errors
    console.debug("[TEST DEBUG] booking fetched for cancellation:", booking);
    if (!booking) {
      console.debug(
        "[TEST DEBUG] no booking found for session",
        testSession.id,
      );
    } else {
      const bookingStudent = await studentRepository.findOne({
        where: { id: booking.studentId },
      });
      console.debug("[TEST DEBUG] bookingStudent found:", bookingStudent);
    }
    const bookingStudent = await studentRepository.findOne({
      where: { id: booking.studentId },
    });
    expect(bookingStudent).not.toBeNull();
    if (!bookingStudent) throw new Error("Expected booking student to exist");

    await request(app.getHttpServer() as unknown as Application)
      .post(`/bookings/${booking.id}/cancel`)
      .set("x-auth-user-id", String(bookingStudent.userId))
      .send({ reason: "test" })
      .expect(201);

    const waitlistEntry = await waitlistRepository.findOne({
      where: { sessionId: testSession.id, studentId: testStudent.id },
    });
    expect(waitlistEntry).not.toBeNull();
    if (!waitlistEntry)
      throw new Error("Expected waitlist entry to exist after cancellation");
    expect(waitlistEntry.notifiedAt).not.toBeNull();
    expect(waitlistEntry.notificationExpiresAt).not.toBeNull();
  });

  it("admin can promote a student from the waitlist to a booking", async () => {
    // Student 2 joins the waitlist
    const waitlistResponse = await request(
      app.getHttpServer() as unknown as Application,
    )
      .post("/waitlists")
      .send({ sessionId: testSession.id, studentId: testStudent.id })
      .expect(201);

    const waitlistBody = waitlistResponse.body as WaitlistResponse;

    // Student 1 cancels, freeing up a spot
    const bookingToDelete = await bookingRepository.findOne({
      where: { sessionId: testSession.id },
    });
    expect(bookingToDelete).not.toBeNull();
    if (!bookingToDelete)
      throw new Error("Expected existing booking to delete");
    await bookingRepository.delete(bookingToDelete.id);

    // Admin promotes student 2
    const adminUser = await userRepository.save({
      email: "admin@test.com",
      firstName: "Admin",
      lastName: "User",
      passwordHash: "hash",
      isAdmin: true,
    });
    // Create a signed session cookie for admin to satisfy AdminGuard
    const secret =
      process.env.SESSION_SECRET || "dev_insecure_secret_change_me";
    const token = jwt.sign(
      {
        sub: String(adminUser.id),
        email: adminUser.email,
        name: [adminUser.firstName, adminUser.lastName]
          .filter(Boolean)
          .join(" "),
        roles: ["admin"],
        sid: "test-session",
        type: "access",
      },
      secret,
      { algorithm: "HS256", expiresIn: "1d" },
    );

    await request(app.getHttpServer() as unknown as Application)
      .post(`/waitlists/${waitlistBody.id}/promote`)
      .set("Cookie", `thrive_sess=${token}`)
      .expect(201);

    const newBooking = await bookingRepository.findOne({
      where: { sessionId: testSession.id, studentId: testStudent.id },
    });
    expect(newBooking).not.toBeNull();
    if (!newBooking) throw new Error("Expected new booking after promotion");
    expect(newBooking.status).toBe(BookingStatus.CONFIRMED);

    const finalWaitlistEntry = await waitlistRepository.findOne({
      where: { id: waitlistBody.id },
    });
    expect(finalWaitlistEntry).toBeNull();
  });
});
