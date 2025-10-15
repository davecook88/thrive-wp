import { describe, it, beforeEach, expect, afterEach, beforeAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import { DataSource, Repository } from "typeorm";
import request from "supertest";
import { PackagesService } from "../src/packages/packages.service.js";
import { PaymentsService } from "../src/payments/payments.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StudentPackage } from "../src/packages/entities/student-package.entity.js";
import { PackageUse } from "../src/packages/entities/package-use.entity.js";
import { Student } from "../src/students/entities/student.entity.js";
import { Session } from "../src/sessions/entities/session.entity.js";
import { Booking } from "../src/payments/entities/booking.entity.js";
import { User } from "../src/users/entities/user.entity.js";
import { BookingStatus } from "../src/payments/entities/booking.entity.js";
import {
  SessionStatus,
  SessionVisibility,
} from "../src/sessions/entities/session.entity.js";
import { ServiceType } from "../src/common/types/class-types.js";
import type supertest from "supertest";
import { Teacher } from "../src/teachers/entities/teacher.entity.js";
import { AppModule } from "../src/app.module.js";
import { resetDatabase } from "./utils/reset-db.js";
import { runMigrations } from "./setup.js";
import {
  BookingResponseSchema,
  BookWithPackagePayloadSchema,
} from "@thrive/shared";

describe("Package Booking (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let dataSource: DataSource;
  let packagesService: PackagesService;
  let paymentsService: PaymentsService;
  let studentPackageRepository: Repository<StudentPackage>;
  let packageUseRepository: Repository<PackageUse>;
  let studentRepository: Repository<Student>;
  let sessionRepository: Repository<Session>;
  let bookingRepository: Repository<Booking>;
  let userRepository: Repository<User>;
  let teacherRepository: Repository<Teacher>;
  let testTeacherId: number;

  // Test data
  let testUserId: number;
  let testStudentId: number;
  let testPackageId: number;
  let testSessionId: number;

  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forFeature([
          StudentPackage,
          PackageUse,
          Student,
          Session,
          Booking,
          User,
        ]),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    // Retrieve DataSource BEFORE attempting reset
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await resetDatabase(dataSource);
    httpServer = app.getHttpServer() as Server;
    packagesService = moduleFixture.get<PackagesService>(PackagesService);
    paymentsService = moduleFixture.get<PaymentsService>(PaymentsService);

    // touch these so linters don't flag "assigned but never used"
    void dataSource;
    void packagesService;
    void paymentsService;
    void bookingRepository;

    studentPackageRepository = moduleFixture.get<Repository<StudentPackage>>(
      "StudentPackageRepository",
    );
    packageUseRepository = moduleFixture.get<Repository<PackageUse>>(
      "PackageUseRepository",
    );
    studentRepository =
      moduleFixture.get<Repository<Student>>("StudentRepository");
    sessionRepository =
      moduleFixture.get<Repository<Session>>("SessionRepository");
    bookingRepository =
      moduleFixture.get<Repository<Booking>>("BookingRepository");
    userRepository = moduleFixture.get<Repository<User>>("UserRepository");
    teacherRepository =
      moduleFixture.get<Repository<Teacher>>("TeacherRepository");

    // Set up test data
    await setupTestData();
  });

  async function setupTestData() {
    // Create or reuse test user
    const testEmail = "test@example.com";
    let savedUser = await userRepository.findOne({
      where: { email: testEmail },
    });
    if (!savedUser) {
      const userPartial: Partial<User> = {
        email: testEmail,
        firstName: "Test",
        lastName: "User",
        passwordHash: "hashed",
      };
      const user = userRepository.create(userPartial);
      savedUser = await userRepository.save(user);
    }
    testUserId = savedUser.id;

    // Create or reuse test student (one-to-one with user)
    let savedStudent = await studentRepository.findOne({
      where: { userId: testUserId },
    });
    if (!savedStudent) {
      const student = studentRepository.create({ userId: testUserId });
      savedStudent = await studentRepository.save(student);
    }
    testStudentId = savedStudent.id;

    // Create or reuse test teacher (use separate user for clarity)
    const teacherEmail = "teacher@example.com";
    let savedTeacherUser = await userRepository.findOne({
      where: { email: teacherEmail },
    });
    if (!savedTeacherUser) {
      const teacherUser = userRepository.create({
        email: teacherEmail,
        firstName: "Teach",
        lastName: "Er",
        passwordHash: "hashed",
      });
      savedTeacherUser = await userRepository.save(teacherUser);
    }

    let savedTeacher = await teacherRepository.findOne({
      where: { userId: savedTeacherUser.id },
    });
    if (!savedTeacher) {
      const teacherPartial: Partial<Teacher> = {
        userId: savedTeacherUser.id,
        tier: 10,
        bio: null,
        isActive: true,
      };
      const teacher = teacherRepository.create(teacherPartial);
      savedTeacher = await teacherRepository.save(teacher);
    }
    testTeacherId = savedTeacher.id;

    // Create test session
    const sessionPartial: Partial<Session> = {
      teacherId: testTeacherId,
      startAt: new Date(Date.now() + 86400000),
      endAt: new Date(Date.now() + 86400000 + 3600000),
      status: SessionStatus.SCHEDULED,
      visibility: SessionVisibility.PUBLIC,
      type: ServiceType.PRIVATE,
      capacityMax: 1,
      courseId: null,
      createdFromAvailabilityId: null,
      requiresEnrollment: false,
      meetingUrl: null,
      sourceTimezone: null,
    };
    const session = sessionRepository.create(sessionPartial);
    const savedSession = await sessionRepository.save(session);
    testSessionId = savedSession.id;

    // Create test package
    const studentPackage = studentPackageRepository.create({
      studentId: testStudentId,
      packageName: "5-class test pack",
      totalSessions: 5,
      remainingSessions: 3,
      purchasedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000), // 30 days from now
      sourcePaymentId: "test_payment_123",
      metadata: {
        service_type: ServiceType.PRIVATE,
        teacher_tier: "10", // Match the teacher's tier
      },
    });
    const savedPackage = await studentPackageRepository.save(studentPackage);
    testPackageId = savedPackage.id;
  }
  // Removed unused variable casts that triggered lint warnings.

  afterEach(async () => {
    // Clean up test data
    // await packageUseRepository.delete({});
    // await bookingRepository.delete({});
    // await studentPackageRepository.delete({});
    // await sessionRepository.delete({});
    // await studentRepository.delete({});
    // await userRepository.delete({});

    await app.close();
  });

  describe("GET /packages/my-credits", () => {
    it("should return student credits", async () => {
      interface MyCreditsResponse {
        packages: Array<{
          packageName: string;
          remainingSessions: number;
        }>;
        totalRemaining: number;
      }
      const response = (await request(httpServer)
        .get("/packages/my-credits")
        .set("x-auth-user-id", testUserId.toString())
        .expect(200)) as supertest.Response & { body: MyCreditsResponse };

      const creditsBody = response.body as unknown as MyCreditsResponse;
      expect(creditsBody.packages).toHaveLength(1);
      const pkg = creditsBody.packages[0];
      expect(pkg.packageName).toBe("5-class test pack");
      expect(pkg.remainingSessions).toBe(3);
      expect(creditsBody.totalRemaining).toBe(3);
    });

    it("should return 401 when user not authenticated", async () => {
      await request(httpServer).get("/packages/my-credits").expect(401);
    });
  });

  describe("POST /payments/book-with-package", () => {
    it("should successfully book session with package credit", async () => {
      const payload = BookWithPackagePayloadSchema.parse({
        packageId: testPackageId,
        sessionId: testSessionId,
      });
      const response = await request(httpServer)
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUserId.toString())
        .send(payload);
      if (response.statusCode !== 201) {
        throw new Error(
          `Unexpected status code: ${response.statusCode}, body: ${JSON.stringify(response.body)}`,
        );
      }

      const body = BookingResponseSchema.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.status).toBe(BookingStatus.CONFIRMED);
      expect(body.studentPackageId).toBe(testPackageId);
      expect(body.creditsCost).toBe(1);

      // Verify package was decremented
      const updatedPackage = await studentPackageRepository.findOne({
        where: { id: testPackageId },
      });
      expect(updatedPackage?.remainingSessions).toBe(2);

      // Verify package_use record created
      const packageUse = await packageUseRepository.findOne({
        where: { studentPackageId: testPackageId },
      });
      expect(packageUse).toBeDefined();
      expect(packageUse?.sessionId).toBe(testSessionId);
      expect(packageUse?.bookingId).toBe(body.id);
    });

    it("should return 400 when package has no remaining sessions", async () => {
      // Update package to have 0 remaining sessions
      await studentPackageRepository.update(testPackageId, {
        remainingSessions: 0,
      });

      await request(httpServer)
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUserId.toString())
        .send({
          packageId: testPackageId,
          sessionId: testSessionId,
        })
        .expect(400);
    });

    it("should return 404 when package not found", async () => {
      await request(httpServer)
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUserId.toString())
        .send({
          packageId: 99999, // non-existent package
          sessionId: testSessionId,
        })
        .expect(404);
    });

    it("should return 400 when package is expired", async () => {
      // Update package to be expired
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      await studentPackageRepository.update(testPackageId, {
        expiresAt: pastDate,
      });

      await request(httpServer)
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUserId.toString())
        .send({
          packageId: testPackageId,
          sessionId: testSessionId,
        })
        .expect(400);
    });

    it("should return 400 with invalid request body", async () => {
      await request(httpServer)
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUserId.toString())
        .send({
          packageId: "invalid", // should be number
          sessionId: testSessionId,
        })
        .expect(400);
    });
  });

  describe("POST /packages/:id/use", () => {
    it("should successfully use package for session", async () => {
      interface PackageUseResponse {
        package: { remainingSessions: number };
        use: { sessionId: number };
      }
      const response = (await request(httpServer)
        .post(`/packages/${testPackageId}/use`)
        .set("x-auth-user-id", testUserId.toString())
        .send({
          sessionId: testSessionId,
        })
        .expect(201)) as supertest.Response & { body: PackageUseResponse };

      const useBody = response.body as unknown as PackageUseResponse;
      expect(useBody.package.remainingSessions).toBe(2);
      expect(useBody.use.sessionId).toBe(testSessionId);

      // Verify database changes
      const updatedPackage = await studentPackageRepository.findOne({
        where: { id: testPackageId },
      });
      expect(updatedPackage?.remainingSessions).toBe(2);
    });
  });

  describe("Concurrency test", () => {
    it("should handle concurrent package usage correctly", async () => {
      // Set package to have only 1 remaining session
      await studentPackageRepository.update(testPackageId, {
        remainingSessions: 1,
      });

      // Create two sessions
      const session2Partial: Partial<Session> = {
        teacherId: testTeacherId,
        startAt: new Date(Date.now() + 172800000),
        endAt: new Date(Date.now() + 172800000 + 3600000),
        status: SessionStatus.SCHEDULED,
        visibility: SessionVisibility.PUBLIC,
        type: ServiceType.PRIVATE,
        capacityMax: 1,
        courseId: null,
        createdFromAvailabilityId: null,
        requiresEnrollment: false,
        meetingUrl: null,
        sourceTimezone: null,
      };
      const session2 = sessionRepository.create(session2Partial);
      const savedSession2 = await sessionRepository.save(session2);

      // Attempt to use the package for both sessions simultaneously
      const promises = [
        request(httpServer)
          .post(`/packages/${testPackageId}/use`)
          .set("x-auth-user-id", testUserId.toString())
          .send({ sessionId: testSessionId }),
        request(httpServer)
          .post(`/packages/${testPackageId}/use`)
          .set("x-auth-user-id", testUserId.toString())
          .send({ sessionId: savedSession2.id }),
      ];

      const results = await Promise.allSettled(promises);

      // Exactly one should succeed, one should fail
      const successfulRequests = results.filter(
        (r) => r.status === "fulfilled" && r.value.status === 201,
      );
      const failedRequests = results.filter(
        (r) => r.status === "fulfilled" && r.value.status === 400,
      );

      expect(successfulRequests).toHaveLength(1);
      expect(failedRequests).toHaveLength(1);

      // Verify package has 0 remaining sessions
      const finalPackage = await studentPackageRepository.findOne({
        where: { id: testPackageId },
      });
      expect(finalPackage?.remainingSessions).toBe(0);
    });
  });
});
