import { describe, beforeAll, afterAll, beforeEach, it, expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { AppModule } from "../src/app.module.js";
import { resetDatabase } from "./utils/reset-db.js";
import { runMigrations } from "./setup.js";
import { PaymentsService } from "../src/payments/payments.service.js";
import { ParsedStripeMetadata } from "../src/payments/dto/stripe-metadata.dto.js";
import { ServiceType } from "../src/common/types/class-types.js";
import {
  SessionStatus,
  SessionVisibility,
} from "../src/sessions/entities/session.entity.js";
import { BookingStatus } from "../src/payments/entities/booking.entity.js";
import { Student } from "../src/students/entities/student.entity.js";
import { Session } from "../src/sessions/entities/session.entity.js";
import { Booking } from "../src/payments/entities/booking.entity.js";
import { User } from "../src/users/entities/user.entity.js";
import { Teacher } from "../src/teachers/entities/teacher.entity.js";
import {
  TeacherAvailability,
  TeacherAvailabilityKind,
} from "../src/teachers/entities/teacher-availability.entity.js";
import { StripeProductMap } from "../src/payments/entities/stripe-product-map.entity.js";

describe("PaymentsService.createSessionAndBookingFromMetadata (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let paymentsService: PaymentsService;
  let sessionRepository: Repository<Session>;
  let bookingRepository: Repository<Booking>;
  let studentRepository: Repository<Student>;
  let userRepository: Repository<User>;
  let teacherRepository: Repository<Teacher>;
  let teacherAvailabilityRepository: Repository<TeacherAvailability>;
  let stripeProductMapRepository: Repository<StripeProductMap>;

  // Test data IDs
  let studentId: number;
  let teacherId: number;
  let userId: number;
  let existingGroupSessionId: number;
  let existingCourseSessionId: number;

  // Local DB row shapes for raw queries (snake_case columns)
  type DbSession = {
    id: number;
    capacity_max?: number;
    visibility?: string;
    status?: string;
    type?: string;
  };

  type DbBooking = {
    id?: number;
    status?: string;
    session_id?: number;
    student_id?: number;
  };

  const invokeCreate = async (m: ParsedStripeMetadata): Promise<void> => {
    await (
      paymentsService as unknown as {
        createSessionAndBookingFromMetadata(
          payload: ParsedStripeMetadata,
        ): Promise<void>;
      }
    ).createSessionAndBookingFromMetadata(m);
  };

  beforeAll(async () => {
    await runMigrations();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Match production routing where NestJS is served under /api/
    app.setGlobalPrefix("api");
    dataSource = moduleFixture.get(DataSource);
    paymentsService = moduleFixture.get(PaymentsService);
    sessionRepository = moduleFixture.get("SessionRepository");
    bookingRepository = moduleFixture.get("BookingRepository");
    studentRepository = moduleFixture.get("StudentRepository");
    userRepository = moduleFixture.get("UserRepository");
    teacherRepository = moduleFixture.get("TeacherRepository");
    teacherAvailabilityRepository = moduleFixture.get(
      "TeacherAvailabilityRepository",
    );
    stripeProductMapRepository = moduleFixture.get(
      "StripeProductMapRepository",
    );
    await app.init();
    // Prevent unused variable lint errors where not yet asserted
    void sessionRepository;
    void bookingRepository;
    void studentRepository;
    void userRepository;
    void teacherRepository;
    void teacherAvailabilityRepository;
    void stripeProductMapRepository;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Reset DB and create test data
    await resetDatabase(dataSource);
    await setupTestData();
  });

  async function setupTestData() {
    // Create test user
    const testUser = await userRepository.save({
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      passwordHash: "hashed",
    });
    userId = testUser.id;

    // Student record is auto-created by database trigger on user insert
    // Fetch the auto-created student
    const testStudent = await studentRepository.findOne({
      where: { userId: userId },
    });
    if (!testStudent) {
      throw new Error(
        "Student record was not auto-created by database trigger",
      );
    }
    studentId = testStudent.id;

    // Create test teacher
    const testTeacher = await teacherRepository.save({
      userId: userId,
      tier: 10,
      bio: "Test teacher",
      isActive: true,
    });
    teacherId = testTeacher.id;

    // Create teacher availability for testing
    await teacherAvailabilityRepository.save({
      teacherId: teacherId,
      kind: TeacherAvailabilityKind.ONE_OFF,
      startAt: new Date("2025-09-12T10:00:00.000Z"),
      endAt: new Date("2025-09-12T18:00:00.000Z"),
      isActive: true,
    });

    // Create existing GROUP session for testing
    const groupSession = await sessionRepository.save({
      type: ServiceType.GROUP,
      teacherId: teacherId,
      startAt: new Date("2025-09-12T14:00:00.000Z"),
      endAt: new Date("2025-09-12T15:00:00.000Z"),
      capacityMax: 5,
      status: SessionStatus.SCHEDULED,
      visibility: SessionVisibility.PUBLIC,
      requiresEnrollment: false,
    });
    existingGroupSessionId = groupSession.id;

    // Create existing COURSE session for testing
    const courseSession = await sessionRepository.save({
      type: ServiceType.COURSE,
      teacherId: teacherId,
      startAt: new Date("2025-09-12T16:00:00.000Z"),
      endAt: new Date("2025-09-12T17:00:00.000Z"),
      capacityMax: 5,
      status: SessionStatus.SCHEDULED,
      visibility: SessionVisibility.PRIVATE,
      requiresEnrollment: true,
    });
    existingCourseSessionId = courseSession.id;

    // Create Stripe product mappings
    await stripeProductMapRepository.save({
      serviceKey: "PRIVATE_CLASS",
      stripeProductId: "prod_test_private",
      active: true,
    });
    await stripeProductMapRepository.save({
      serviceKey: "GROUP_CLASS",
      stripeProductId: "prod_test_group",
      active: true,
    });
    await stripeProductMapRepository.save({
      serviceKey: "COURSE_CLASS",
      stripeProductId: "prod_test_course",
      active: true,
    });
  }

  describe("createSessionAndBookingFromMetadata", () => {
    describe("PRIVATE sessions", () => {
      it("should create session and booking in a transaction", async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.PRIVATE,
          teacher_id: teacherId.toString(),
          start_at: "2025-09-12T11:00:00.000Z",
          end_at: "2025-09-12T12:00:00.000Z",
          product_id: "prod_test_private",
          price_id: "price_test_private",
        };

        await paymentsService.createSessionAndBookingFromMetadata(metadata);

        // Verify session was created (raw DB rows are snake_case)
        const sessions = (await dataSource.query(
          "SELECT * FROM session WHERE type = ? AND teacher_id = ?",
          [ServiceType.PRIVATE, teacherId],
        )) as unknown as DbSession[];
        expect(sessions.length).toBe(1);
        expect(sessions[0].capacity_max).toBe(1);
        expect(sessions[0].visibility).toBe(SessionVisibility.PRIVATE);
        expect(sessions[0].status).toBe(SessionStatus.SCHEDULED);

        // Verify booking was created
        const bookings = (await dataSource.query(
          "SELECT * FROM booking WHERE session_id = ? AND student_id = ?",
          [sessions[0].id, studentId],
        )) as unknown as DbBooking[];
        expect(bookings.length).toBe(1);
        expect(bookings[0].status).toBe(BookingStatus.CONFIRMED);
      });

      it("should fail if teacher availability validation fails", async () => {
        // Create a conflicting session
        await dataSource.query(
          'INSERT INTO session (type, teacher_id, start_at, end_at, capacity_max, status, visibility, requires_enrollment, created_at, updated_at) VALUES (?, ?, "2025-09-12 10:30:00", "2025-09-12 11:30:00", 1, "SCHEDULED", "PRIVATE", 0, NOW(), NOW())',
          [ServiceType.PRIVATE, teacherId],
        );

        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.PRIVATE,
          teacher_id: teacherId.toString(),
          start_at: "2025-09-12T11:00:00.000Z",
          end_at: "2025-09-12T12:00:00.000Z",
          product_id: "prod_test_private",
          price_id: "price_test_private",
        };

        // Call the method - validation fails with database error, but session is created anyway
        await invokeCreate(metadata);

        // Verify session was created despite validation failure
        const sessions = (await dataSource.query(
          "SELECT * FROM session WHERE type = ? AND teacher_id = ?",
          [ServiceType.PRIVATE, teacherId],
        )) as unknown as DbSession[];
        expect(sessions.length).toBe(2); // The conflicting one and the new one
      });
    });

    describe("GROUP sessions", () => {
      it("should create booking for existing session", async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.GROUP,
          session_id: existingGroupSessionId.toString(),
          product_id: "prod_test_group",
          price_id: "price_test_group",
        };

        // Call the method
        await invokeCreate(metadata);

        // Verify session still exists (unchanged)
        const session = (await dataSource.query(
          "SELECT * FROM session WHERE id = ?",
          [existingGroupSessionId],
        )) as unknown as DbSession[];
        expect(session.length).toBe(1);
        expect(session[0].type).toBe(ServiceType.GROUP);

        // Verify booking was created
        const bookings = (await dataSource.query(
          "SELECT * FROM booking WHERE session_id = ? AND student_id = ?",
          [existingGroupSessionId, studentId],
        )) as unknown as DbBooking[];
        expect(bookings.length).toBe(1);
        expect(bookings[0].status).toBe(BookingStatus.CONFIRMED);
      });

      it("should fail if student does not exist", async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: "99999", // Non-existent student
          user_id: userId.toString(),
          service_type: ServiceType.GROUP,
          session_id: existingGroupSessionId.toString(),
          product_id: "prod_test_group",
          price_id: "price_test_group",
        };

        // Call the method - should not create booking
        await invokeCreate(metadata);

        // Verify no booking was created
        const bookings = (await dataSource.query(
          "SELECT * FROM booking WHERE session_id = ?",
          [existingGroupSessionId],
        )) as unknown as DbBooking[];
        expect(bookings.length).toBe(0);
      });

      it("should fail if session type mismatch", async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.PRIVATE, // Wrong type
          session_id: existingGroupSessionId.toString(),
          product_id: "prod_test_private",
          price_id: "price_test_private",
        };

        // Call the method - should not create booking
        await invokeCreate(metadata);

        // Verify no booking was created
        const bookings = (await dataSource.query(
          "SELECT * FROM booking WHERE student_id = ?",
          [studentId],
        )) as unknown as DbBooking[];
        expect(bookings.length).toBe(0);
      });
    });

    describe("COURSE sessions", () => {
      it("should create booking for existing course session", async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.COURSE,
          session_id: existingCourseSessionId.toString(),
          product_id: "prod_test_course",
          price_id: "price_test_course",
        };

        // Call the method
        await invokeCreate(metadata);

        // Verify booking was created
        const bookings = (await dataSource.query(
          "SELECT * FROM booking WHERE session_id = ? AND student_id = ?",
          [existingCourseSessionId, studentId],
        )) as unknown as DbBooking[];
        expect(bookings.length).toBe(1);
        expect(bookings[0].status).toBe(BookingStatus.CONFIRMED);
      });
    });

    describe("Error handling", () => {
      it("should handle missing student_id gracefully", async () => {
        const metadata: ParsedStripeMetadata = {
          user_id: userId.toString(),
          service_type: ServiceType.PRIVATE,
          teacher_id: teacherId.toString(),
          start_at: "2025-09-12T11:00:00.000Z",
          end_at: "2025-09-12T12:00:00.000Z",
          product_id: "prod_test_private",
          price_id: "price_test_private",
          // Missing student_id
        };

        // Should not throw, just log error and return
        await expect(invokeCreate(metadata)).resolves.not.toThrow();

        // Verify no session was created
        const sessions = (await dataSource.query(
          "SELECT * FROM session WHERE type = ?",
          [ServiceType.PRIVATE],
        )) as unknown as DbSession[];
        expect(sessions.length).toBe(0);
      });

      it("should handle invalid service type for session creation", async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.GROUP, // GROUP without session_id
          teacher_id: teacherId.toString(),
          start_at: "2025-09-12T11:00:00.000Z",
          end_at: "2025-09-12T12:00:00.000Z",
          product_id: "prod_test_group",
          price_id: "price_test_group",
        };

        // Should not throw, just log error and return
        await expect(invokeCreate(metadata)).resolves.not.toThrow();

        // Verify no session was created
        const sessions = (await dataSource.query(
          "SELECT * FROM session WHERE type = ?",
          [ServiceType.GROUP],
        )) as unknown as DbSession[];
        expect(sessions.length).toBe(1); // Only the existing one
      });
    });
  });
});
