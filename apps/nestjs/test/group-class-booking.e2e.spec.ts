import { describe, it, beforeEach, expect, afterEach, beforeAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import jwt from "jsonwebtoken";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DataSource, Repository } from "typeorm";
import { resetDatabase } from "./utils/reset-db.js";
import { User } from "../src/users/entities/user.entity.js";
import { Student } from "../src/students/entities/student.entity.js";
import { Teacher } from "../src/teachers/entities/teacher.entity.js";
import { Booking } from "../src/payments/entities/booking.entity.js";
import { Level } from "../src/levels/entities/level.entity.js";
import { runMigrations } from "./setup.js";
import * as z from "zod";

import {
  CreateBookingResponseSchema,
  CreateGroupClassResponseSchema,
  SessionWithEnrollmentResponseSchema,
} from "@thrive/shared";
import { getHttpServer } from "./utils/get-httpserver.js";

describe("Group Class Booking (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let studentRepository: Repository<Student>;
  let teacherRepository: Repository<Teacher>;

  let bookingRepository: Repository<Booking>;
  let levelRepository: Repository<Level>;

  let testUser: User;
  let testStudent: Student | null;
  let testTeacher: Teacher;
  let testLevel: Level | null;
  let testAdminToken: string | null = null;

  beforeAll(async () => {
    await runMigrations();
  });

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
    // groupClassRepository was removed; repository not needed in this test
    bookingRepository = dataSource.getRepository(Booking);
    levelRepository = dataSource.getRepository(Level);

    await setupTestData();
  });

  afterEach(async () => {
    await app.close();
  });

  async function setupTestData() {
    testUser = await userRepository.save({
      email: "student@test.com",
      firstName: "Test",
      lastName: "Student",
      passwordHash: "hash",
    });
    // The DB migration creates a trigger that auto-inserts a student row when a user is created.
    // Avoid attempting to insert a duplicate student (which violates the unique index).
    testStudent = await studentRepository.findOne({
      where: { userId: testUser.id },
    });
    if (!testStudent) {
      testStudent = await studentRepository.save({ userId: testUser.id });
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
    // Create an admin user and signed session token for AdminGuard
    const adminUser = await userRepository.save({
      email: "admin@test.com",
      firstName: "Admin",
      lastName: "User",
      passwordHash: "hash",
      isAdmin: true,
    });
    const secret =
      process.env.SESSION_SECRET || "dev_insecure_secret_change_me";
    testAdminToken = jwt.sign(
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
    testLevel = await levelRepository.findOne({ where: { code: "A1" } });
    if (!testLevel) {
      // Create a minimal A1 level for tests
      testLevel = await levelRepository.save({
        code: "A1",
        name: "Beginner A1",
        description: "Auto-created test level A1",
        sortOrder: 1,
        isActive: true,
      });
    }
  }

  it("should create a group class, generate sessions, and see them as available", async () => {
    // Create a group class
    const groupClassRes = await request(getHttpServer(app))
      .post("/group-classes")
      .set("Cookie", `thrive_sess=${testAdminToken}`)
      .send({
        title: "Test Group Class",
        description: "A test group class",
        levelIds: [testLevel!.id],
        capacityMax: 10,
        teacherIds: [testTeacher.id],
        primaryTeacherId: testTeacher.id,
        rrule: "FREQ=WEEKLY;COUNT=5;BYDAY=MO",
        startDate: "2025-01-06",
        sessionStartTime: "10:00",
        sessionDuration: 60,
      })
      .expect(201);

    // Validate response with zod schema
    const groupClassParse = CreateGroupClassResponseSchema.safeParse(
      groupClassRes.body,
    );
    if (!groupClassParse.success) {
      throw new Error(
        `Invalid CreateGroupClassResponse: ${groupClassParse.error.message}`,
      );
    }
    const groupClassData = groupClassParse.data;

    // Generate sessions
    await request(getHttpServer(app))
      .post(`/group-classes/${groupClassData.id}/generate-sessions`)
      .expect(201);

    // Check if sessions are available
    const response = await request(getHttpServer(app)).get(
      "/group-classes/available",
    );

    if (!response.ok) {
      console.log("Error response:", response.status, response.body);
      throw new Error("Failed to fetch available sessions");
    }
    // Validate response with zod schema
    const availableSessionsParse = z
      .array(SessionWithEnrollmentResponseSchema)
      .safeParse(response.body);
    if (!availableSessionsParse.success) {
      throw new Error(
        `Invalid AvailableSessionsResponse: ${availableSessionsParse.error.message}`,
      );
    }
    const availableSessionsData = availableSessionsParse.data;

    expect(availableSessionsData).toBeInstanceOf(Array);
    expect(availableSessionsData.length).toBeGreaterThan(0);
  });

  describe("POST /bookings", () => {
    it("should allow a student to book a group class session", async () => {
      // 1. Create a group class
      const groupClassRes = await request(getHttpServer(app))
        .post("/group-classes")
        .set("Cookie", `thrive_sess=${testAdminToken}`)
        .send({
          title: "Movable Type",
          description: "A test group class",
          levelIds: [testLevel!.id],
          capacityMax: 10,
          teacherIds: [testTeacher.id],
          primaryTeacherId: testTeacher.id,
          rrule: "FREQ=WEEKLY;COUNT=1;BYDAY=MO",
          startDate: "2025-01-06",
          sessionStartTime: "10:00",
          sessionDuration: 60,
        })
        .expect(201);

      // Validate response with zod schema
      const groupClassParse = CreateGroupClassResponseSchema.safeParse(
        groupClassRes.body,
      );
      if (!groupClassParse.success) {
        throw new Error(
          `Invalid CreateGroupClassResponse: ${groupClassParse.error.message}`,
        );
      }
      const groupClassData = groupClassParse.data;

      // 2. Generate sessions
      await request(getHttpServer(app))
        .post(`/group-classes/${groupClassData.id}/generate-sessions`)
        .expect(201);

      // 3. Get available sessions
      const availableSessionsRes = await request(getHttpServer(app))
        .get("/group-classes/available")
        .expect(200);

      console.log("Available Sessions Response:", availableSessionsRes.body);

      // Validate response with zod schema
      const availableSessionsParse = z
        .array(SessionWithEnrollmentResponseSchema)
        .safeParse(availableSessionsRes.body);
      if (!availableSessionsParse.success) {
        throw new Error(
          `Invalid AvailableSessionsResponse: ${availableSessionsParse.error.message}`,
        );
      }
      const availableSessionsData = Array.isArray(availableSessionsParse.data)
        ? availableSessionsParse.data
        : [];
      const sessionToBook = availableSessionsData.length
        ? availableSessionsData[0]
        : null;
      expect(sessionToBook).toBeDefined();
      if (!sessionToBook) {
        throw new Error("No available session to book");
      }

      // 4. Book the session as the student
      const bookingRes = await request(getHttpServer(app))
        .post("/bookings")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          sessionId: sessionToBook.id,
          // No payment intent or package, assuming free for now
        })
        .expect(201);

      // Validate response with zod schema
      const bookingParse = CreateBookingResponseSchema.safeParse(
        bookingRes.body,
      );
      if (!bookingParse.success) {
        throw new Error(
          `Invalid CreateBookingResponse: ${bookingParse.error.message}`,
        );
      }
      const bookingData = bookingParse.data;

      expect(bookingData.bookingId).toBeDefined();
      expect(bookingData.status).toEqual("CONFIRMED");

      // 5. Verify in database
      const booking = await bookingRepository.findOne({
        where: { id: bookingData.bookingId },
      });
      expect(booking).not.toBeNull();
      expect(booking!.studentId).toEqual(testStudent!.id);
      expect(booking!.sessionId).toEqual(sessionToBook.id);

      // 6. Verify enrollment count updates
      const updatedSessionsRes = await request(getHttpServer(app))
        .get("/group-classes/available")
        .expect(200);
      const updatedSessionsParse = z
        .array(SessionWithEnrollmentResponseSchema)
        .safeParse(updatedSessionsRes.body);
      if (!updatedSessionsParse.success) {
        throw new Error(
          `Invalid AvailableSessionsResponse: ${updatedSessionsParse.error.message}`,
        );
      }
      const updatedSessionsData = updatedSessionsParse.data;
      const updatedSession = updatedSessionsData.find(
        (s) => s.id === sessionToBook.id,
      );

      expect(updatedSession).toBeDefined();
      expect(updatedSession!.enrolledCount).toBe(1);
      expect(updatedSession!.availableSpots).toBe(9);
    });

    it("should not allow booking a full group class session", async () => {
      const groupClassRes = await request(getHttpServer(app))
        .post("/group-classes")
        .set("Cookie", `thrive_sess=${testAdminToken}`)
        .send({
          title: "Full Class",
          levelIds: [testLevel!.id],
          capacityMax: 1,
          teacherIds: [testTeacher.id],
          primaryTeacherId: testTeacher.id,
          rrule: "FREQ=WEEKLY;COUNT=1;BYDAY=WE",
          startDate: "2025-01-08",
          sessionStartTime: "12:00",
          sessionDuration: 60,
        })
        .expect(201);
      const createdGroupClassParse = CreateGroupClassResponseSchema.safeParse(
        groupClassRes.body,
      );
      if (!createdGroupClassParse.success) {
        throw new Error(
          `Invalid CreateGroupClassResponse: ${createdGroupClassParse.error.message}`,
        );
      }
      const createdGroupClass = createdGroupClassParse.data;
      await request(getHttpServer(app))
        .post(`/group-classes/${createdGroupClass.id}/generate-sessions`)
        .expect(201);
      const availableSessionsRes = await request(getHttpServer(app))
        .get("/group-classes/available")
        .expect(200);
      const availableSessionsParse = z
        .array(SessionWithEnrollmentResponseSchema)
        .safeParse(availableSessionsRes.body);
      if (!availableSessionsParse.success) {
        throw new Error(
          `Invalid AvailableSessionsResponse: ${availableSessionsParse.error.message}`,
        );
      }
      const availableSessionsData = availableSessionsParse.data;
      const sessionToBook = availableSessionsData[0];

      // First student books the only spot
      await request(getHttpServer(app))
        .post("/bookings")
        .set("x-auth-user-id", testUser.id.toString())
        .send({ sessionId: sessionToBook.id })
        .expect(201);

      // Second student tries to book
      const secondUser = await userRepository.save({
        email: "student2@test.com",
        firstName: "Second",
        lastName: "Student",
        passwordHash: "hash",
      });
      await request(getHttpServer(app))
        .post("/bookings")
        .set("x-auth-user-id", secondUser.id.toString())
        .send({ sessionId: sessionToBook.id })
        .expect(400); // Expect a bad request because class is full
    });
  });
});
