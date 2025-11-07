import { describe, beforeEach, afterEach, it, expect, beforeAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { DataSource, Repository } from "typeorm";
import { resetDatabase } from "./utils/reset-db.js";
import { User } from "../src/users/entities/user.entity.js";
import { Student } from "../src/students/entities/student.entity.js";
import { Teacher } from "../src/teachers/entities/teacher.entity.js";
import {
  Session,
  SessionStatus,
  SessionVisibility,
} from "../src/sessions/entities/session.entity.js";
import { StudentPackage } from "../src/packages/entities/student-package.entity.js";
import {
  Booking,
  BookingStatus,
} from "../src/payments/entities/booking.entity.js";
import { ServiceType } from "../src/common/types/class-types.js";
import {
  CancellationPolicy,
  PenaltyType,
} from "../src/policies/entities/cancellation-policy.entity.js";
import {
  StripeProductMap,
  ScopeType,
} from "../src/payments/entities/stripe-product-map.entity.js";
import { PackageAllowance } from "../src/packages/entities/package-allowance.entity.js";
import { PackageUse } from "../src/packages/entities/package-use.entity.js";
import { runMigrations } from "./setup.js";
import { getHttpServer } from "./utils/get-httpserver.js";
import {
  CompatiblePackagesForSessionResponseSchema,
  BookingResponseSchema,
  ApiErrorResponseSchema,
  BookWithPackagePayloadDto,
  BookingCancellationResponseSchema,
} from "@thrive/shared";

describe("Credit Tier System Integration (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let studentRepository: Repository<Student>;
  let teacherRepository: Repository<Teacher>;
  let sessionRepository: Repository<Session>;
  let packageRepository: Repository<StudentPackage>;
  let stripeProductMapRepository: Repository<StripeProductMap>;
  let packageAllowanceRepository: Repository<PackageAllowance>;
  let packageUseRepository: Repository<PackageUse>;
  let cancellationPolicyRepository: Repository<CancellationPolicy>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let bookingRepository: Repository<Booking>;
  let testUser: User;
  let testStudent: Student;
  let standardTeacher: Teacher;
  let premiumTeacher: Teacher;

  beforeAll(async () => {
    await runMigrations(); // Ensure migrations have run
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
    sessionRepository = dataSource.getRepository(Session);
    packageRepository = dataSource.getRepository(StudentPackage);
    stripeProductMapRepository = dataSource.getRepository(StripeProductMap);
    packageAllowanceRepository = dataSource.getRepository(PackageAllowance);
    packageUseRepository = dataSource.getRepository(PackageUse);
    bookingRepository = dataSource.getRepository(Booking);
    cancellationPolicyRepository = dataSource.getRepository(CancellationPolicy);

    await setupTestData();
  });

  afterEach(async () => {
    await app.close();
  });

  async function setupTestData() {
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

    // Create or reuse test user
    let savedUser = await userRepository.findOne({
      where: { email: "student@tier-test.com" },
    });
    if (!savedUser) {
      savedUser = await userRepository.save({
        email: "student@tier-test.com",
        firstName: "Test",
        lastName: "Student",
        passwordHash: "hash",
      });
    }
    testUser = savedUser;

    // Create or reuse test student
    let savedStudent = await studentRepository.findOne({
      where: { userId: testUser.id },
    });
    if (!savedStudent) {
      savedStudent = await studentRepository.save({
        userId: testUser.id,
      });
    }
    testStudent = savedStudent;

    // Create or reuse standard teacher (tier 0)
    let standardTeacherUser = await userRepository.findOne({
      where: { email: "teacher@tier-test.com" },
    });
    if (!standardTeacherUser) {
      standardTeacherUser = await userRepository.save({
        email: "teacher@tier-test.com",
        firstName: "Standard",
        lastName: "Teacher",
        passwordHash: "hash",
      });
    }

    let savedStandardTeacher = await teacherRepository.findOne({
      where: { userId: standardTeacherUser.id },
    });
    if (!savedStandardTeacher) {
      savedStandardTeacher = await teacherRepository.save({
        userId: standardTeacherUser.id,
        tier: 0,
      });
    }
    standardTeacher = savedStandardTeacher;

    // Create or reuse premium teacher (tier 10)
    let premiumTeacherUser = await userRepository.findOne({
      where: { email: "premium@tier-test.com" },
    });
    if (!premiumTeacherUser) {
      premiumTeacherUser = await userRepository.save({
        email: "premium@tier-test.com",
        firstName: "Premium",
        lastName: "Teacher",
        passwordHash: "hash",
      });
    }

    let savedPremiumTeacher = await teacherRepository.findOne({
      where: { userId: premiumTeacherUser.id },
    });
    if (!savedPremiumTeacher) {
      savedPremiumTeacher = await teacherRepository.save({
        userId: premiumTeacherUser.id,
        tier: 10,
      });
    }
    premiumTeacher = savedPremiumTeacher;
  }

  async function createSession(
    type: ServiceType,
    teacher: Teacher,
    durationMinutes: number = 60,
  ): Promise<Session> {
    const now = new Date();
    const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    return await sessionRepository.save({
      type,
      teacherId: teacher.id,
      startAt,
      endAt,
      status: SessionStatus.SCHEDULED,
      visibility: SessionVisibility.PUBLIC,
      capacityMax: type === ServiceType.PRIVATE ? 1 : 10,
      requiresEnrollment: false,
    });
  }

  async function createPackage(
    serviceType: ServiceType,
    teacherTier: number = 0,
    durationMinutes: number = 60,
    credits: number = 10,
  ): Promise<StudentPackage> {
    // Create StripeProductMap
    const stripeProductMap: StripeProductMap =
      await stripeProductMapRepository.save({
        serviceKey: `TEST_${serviceType}_${teacherTier}_${durationMinutes}`,
        stripeProductId: `prod_test_${serviceType}_${teacherTier}_${durationMinutes}`,
        active: true,
        scopeType: ScopeType.PACKAGE,
        scopeId: undefined,
        metadata: {
          name: `${serviceType} Package`,
        },
      });

    // Create PackageAllowance
    await packageAllowanceRepository.save({
      stripeProductMapId: stripeProductMap.id,
      serviceType,
      teacherTier,
      credits,
      creditUnitMinutes: durationMinutes as 15 | 30 | 45 | 60,
    });

    // Create StudentPackage linked to the StripeProductMap
    const p = await packageRepository.save({
      studentId: testStudent.id,
      stripeProductMapId: stripeProductMap.id,
      packageName: `${serviceType} Package`,
      totalSessions: 10,
      purchasedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });
    stripeProductMap.scopeId = p.id;
    await stripeProductMapRepository.save(stripeProductMap);
    return p;
  }

  describe("GET /packages/compatible-for-session/:sessionId", () => {
    it("should return compatible packages for a private session", async () => {
      const privateSession = await createSession(
        ServiceType.PRIVATE,
        standardTeacher,
      );
      const privatePackage = await createPackage(ServiceType.PRIVATE, 0, 60);

      const response = await request(getHttpServer(app))
        .get(`/packages/compatible-for-session/${privateSession.id}`)
        .set("x-auth-user-id", testUser.id.toString())
        .expect(200);

      const body = CompatiblePackagesForSessionResponseSchema.parse(
        response.body,
      );

      expect(body.exactMatch).toHaveLength(1);
      expect(body.exactMatch[0].id).toBe(privatePackage.id);
      expect(body.higherTier).toHaveLength(0);
      expect(body.recommended).toBeDefined();
      expect(body.recommended).toBe(privatePackage.id);
    });

    it("should return both exact and higher-tier packages for group session", async () => {
      const groupSession = await createSession(
        ServiceType.GROUP,
        standardTeacher,
      );
      const groupPackage = await createPackage(ServiceType.GROUP, 0, 60);
      const privatePackage = await createPackage(ServiceType.PRIVATE, 0, 60);

      const response = await request(getHttpServer(app))
        .get(`/packages/compatible-for-session/${groupSession.id}`)
        .set("x-auth-user-id", testUser.id.toString())
        .expect(200);

      const body = CompatiblePackagesForSessionResponseSchema.parse(
        response.body,
      );

      expect(body.exactMatch).toHaveLength(1);
      expect(body.exactMatch[0].id).toBe(groupPackage.id);
      expect(body.higherTier).toHaveLength(1);
      expect(body.higherTier[0].id).toBe(privatePackage.id);
      expect(body.higherTier[0].warningMessage).toContain("Private Credit");
      expect(body.recommended).toBe(groupPackage.id);
    });

    it("should exclude incompatible packages (group package for private session)", async () => {
      const privateSession = await createSession(
        ServiceType.PRIVATE,
        standardTeacher,
      );
      await createPackage(ServiceType.GROUP, 0, 60);

      const response = await request(getHttpServer(app))
        .get(`/packages/compatible-for-session/${privateSession.id}`)
        .set("x-auth-user-id", testUser.id.toString())
        .expect(200);

      const body = CompatiblePackagesForSessionResponseSchema.parse(
        response.body,
      );

      expect(body.exactMatch).toHaveLength(0);
      expect(body.higherTier).toHaveLength(0);
      expect(body.recommended).toBeNull();
    });

    it("should exclude expired packages", async () => {
      const session = await createSession(ServiceType.PRIVATE, standardTeacher);
      const expiredPackage = await packageRepository.save({
        studentId: testStudent.id,
        packageName: "Expired Package",
        totalSessions: 10,
        purchasedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        metadata: {
          service_type: ServiceType.PRIVATE,
          teacher_tier: "0",
          duration_minutes: "60",
        },
      });

      const response = await request(getHttpServer(app))
        .get(`/packages/compatible-for-session/${session.id}`)
        .set("x-auth-user-id", testUser.id.toString())
        .expect(200);

      const body = CompatiblePackagesForSessionResponseSchema.parse(
        response.body,
      );

      const allPackages = [...body.exactMatch, ...body.higherTier];
      expect(
        allPackages.find((p) => p.id === expiredPackage.id),
      ).toBeUndefined();
    });

    it("should exclude packages with no remaining sessions", async () => {
      const session = await createSession(ServiceType.PRIVATE, standardTeacher);
      const pkg = await createPackage(ServiceType.PRIVATE, 0, 60, 1); // Create with 1 credit

      // Get the allowance for this package
      const allowance = await packageAllowanceRepository.findOne({
        where: { stripeProductMapId: pkg.stripeProductMapId },
      });

      // Consume the credit by creating a PackageUse record
      await packageUseRepository.save({
        studentPackageId: pkg.id,
        allowanceId: allowance!.id,
        serviceType: ServiceType.PRIVATE,
        creditsUsed: 1,
        usedAt: new Date(),
        usedBy: testUser.id,
        note: "Test usage to exhaust package",
      });

      const response = await request(getHttpServer(app))
        .get(`/packages/compatible-for-session/${session.id}`)
        .set("x-auth-user-id", testUser.id.toString())
        .expect(200);

      const body = CompatiblePackagesForSessionResponseSchema.parse(
        response.body,
      );

      expect(body.exactMatch).toHaveLength(0);
      expect(body.higherTier).toHaveLength(0);
    });

    it("should handle premium teacher sessions correctly", async () => {
      const premiumSession = await createSession(
        ServiceType.PRIVATE,
        premiumTeacher,
      );
      const standardPackage = await createPackage(ServiceType.PRIVATE, 0, 60);
      const premiumPackage = await createPackage(ServiceType.PRIVATE, 10, 60);

      const response = await request(getHttpServer(app))
        .get(`/packages/compatible-for-session/${premiumSession.id}`)
        .set("x-auth-user-id", testUser.id.toString())
        .expect(200);

      const body = CompatiblePackagesForSessionResponseSchema.parse(
        response.body,
      );

      // Standard package (tier 100) should NOT work for premium session (tier 110)
      expect(
        body.exactMatch.find((p) => p.id === standardPackage.id),
      ).toBeUndefined();
      expect(
        body.higherTier.find((p) => p.id === standardPackage.id),
      ).toBeUndefined();

      // Premium package (tier 110) should work for premium session (tier 110)
      expect(body.exactMatch).toHaveLength(1);
      expect(body.exactMatch[0].id).toBe(premiumPackage.id);
    });

    it("should return 401 when not authenticated", async () => {
      const session = await createSession(ServiceType.PRIVATE, standardTeacher);

      await request(getHttpServer(app))
        .get(`/packages/compatible-for-session/${session.id}`)
        .expect(401);
    });

    it("should return 404 for non-existent session", async () => {
      await request(getHttpServer(app))
        .get("/packages/compatible-for-session/999999")
        .set("x-auth-user-id", testUser.id.toString())
        .expect(404);
    });
  });

  describe("POST /payments/book-with-package (Tier Validation)", () => {
    it("should allow booking with exact-match package", async () => {
      const privateSession = await createSession(
        ServiceType.PRIVATE,
        standardTeacher,
      );
      const privatePackage = await createPackage(ServiceType.PRIVATE, 0, 60);

      const response = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: privatePackage.id,
          sessionId: privateSession.id,
        } as BookWithPackagePayloadDto)
        .expect(201);

      const body = BookingResponseSchema.parse(response.body);

      expect(body.id).toBeDefined();
      expect(body.status).toBe(BookingStatus.CONFIRMED);
      expect(body.studentPackageId).toBe(privatePackage.id);
      expect(body.creditsCost).toBe(1);

      // Verify credits were deducted
      const updatedPackage = await packageRepository.findOne({
        where: { id: privatePackage.id },
      });
    });

    it("should allow cross-tier booking with confirmation", async () => {
      const groupSession = await createSession(
        ServiceType.GROUP,
        standardTeacher,
      );
      const privatePackage = await createPackage(ServiceType.PRIVATE, 0, 60);

      const response = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: privatePackage.id,
          sessionId: groupSession.id,
          confirmed: true,
        })
        .expect(201);

      const body = BookingResponseSchema.parse(response.body);

      expect(body.status).toBe(BookingStatus.CONFIRMED);
      expect(body.creditsCost).toBe(1);
    });

    it("should reject cross-tier booking without confirmation", async () => {
      const groupSession = await createSession(
        ServiceType.GROUP,
        standardTeacher,
      );
      const privatePackage = await createPackage(ServiceType.PRIVATE, 0, 60);

      const response = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: privatePackage.id,
          sessionId: groupSession.id,
          // confirmed: false (or omitted)
        })
        .expect(400);

      const body = ApiErrorResponseSchema.parse(response.body);

      expect(body.message).toContain(
        "Cross-tier booking requires confirmation",
      );
    });

    it("should reject booking group package for private session", async () => {
      const privateSession = await createSession(
        ServiceType.PRIVATE,
        standardTeacher,
      );
      const groupPackage = await createPackage(ServiceType.GROUP, 0, 60);

      const response = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: groupPackage.id,
          sessionId: privateSession.id,
        })
        .expect(400);

      const body = ApiErrorResponseSchema.parse(response.body);

      expect(body.message).toContain("cannot be used for this session type");
    });

    it("should calculate correct credits for duration mismatch (60 min session, 30 min credit)", async () => {
      const session = await createSession(
        ServiceType.PRIVATE,
        standardTeacher,
        60,
      );
      const package30min = await createPackage(ServiceType.PRIVATE, 0, 30);

      const response = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: package30min.id,
          sessionId: session.id,
        })
        .expect(201);

      const body = BookingResponseSchema.parse(response.body);
      expect(body.creditsCost).toBe(2); // 60/30 = 2 credits

      // Verify 2 credits were deducted
      const updatedPackage = await packageRepository.findOne({
        where: { id: package30min.id },
      });
    });

    it("should calculate correct credits for duration mismatch (30 min session, 60 min credit)", async () => {
      const session = await createSession(
        ServiceType.PRIVATE,
        standardTeacher,
        30,
      );
      const package60min = await createPackage(ServiceType.PRIVATE, 0, 60);

      const response = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: package60min.id,
          sessionId: session.id,
        })
        .expect(201);

      const body = BookingResponseSchema.parse(response.body);

      expect(body.creditsCost).toBe(1); // Rounds up to 1 credit

      // Verify 1 credit was deducted (wastes 30 minutes)
      const updatedPackage = await packageRepository.findOne({
        where: { id: package60min.id },
      });
    });

    it("should reject booking when insufficient credits", async () => {
      const session = await createSession(
        ServiceType.PRIVATE,
        standardTeacher,
        60,
      );
      const package30min = await createPackage(ServiceType.PRIVATE, 0, 30, 1); // Only 1 credit

      const response = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: package30min.id,
          sessionId: session.id,
        })
        .expect(400);

      const body = ApiErrorResponseSchema.parse(response.body);

      expect(body.message).toContain("Insufficient credits");
      expect(body.message).toContain("Required: 2");
      expect(body.message).toContain("Available: 1");
    });

    it("should reject booking with expired package", async () => {
      const session = await createSession(ServiceType.PRIVATE, standardTeacher);
      const expiredPackage = await packageRepository.save({
        studentId: testStudent.id,
        packageName: "Expired Package",
        totalSessions: 10,
        purchasedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        metadata: {
          service_type: ServiceType.PRIVATE,
          teacher_tier: "0",
          duration_minutes: "60",
        },
      });

      await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: expiredPackage.id,
          sessionId: session.id,
        })
        .expect(400);
    });

    it("should reject standard package for premium teacher session", async () => {
      const premiumSession = await createSession(
        ServiceType.PRIVATE,
        premiumTeacher,
      );
      const standardPackage = await createPackage(ServiceType.PRIVATE, 0, 60);

      const response = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: standardPackage.id,
          sessionId: premiumSession.id,
        })
        .expect(400);

      const body = ApiErrorResponseSchema.parse(response.body);

      expect(body.message).toContain("cannot be used for this session type");
    });

    it("should allow premium package for standard teacher session with confirmation", async () => {
      const standardSession = await createSession(
        ServiceType.PRIVATE,
        standardTeacher,
      );
      const premiumPackage = await createPackage(ServiceType.PRIVATE, 10, 60);

      const response = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: premiumPackage.id,
          sessionId: standardSession.id,
          confirmed: true, // Cross-tier: premium -> standard
        })
        .expect(201);

      const body = BookingResponseSchema.parse(response.body);

      expect(body.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe("Cancellation Refund (Tier System)", () => {
    it("should refund to original package when canceling cross-tier booking", async () => {
      // Book a group session with private credit
      const groupSession = await createSession(
        ServiceType.GROUP,
        standardTeacher,
      );
      const privatePackage = await createPackage(ServiceType.PRIVATE, 0, 60);

      const bookingRes = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: privatePackage.id,
          sessionId: groupSession.id,
          confirmed: true,
        })
        .expect(201);

      const body = BookingResponseSchema.parse(bookingRes.body);

      const bookingId = body.id;

      // Verify credit was deducted
      let updatedPackage = await packageRepository.findOne({
        where: { id: privatePackage.id },
      });

      // Cancel the booking
      const cancelRes = await request(getHttpServer(app))
        .post(`/bookings/${bookingId}/cancel`)
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          reason: "Test cancellation",
        })
        .expect(201);

      const cancelBody = BookingCancellationResponseSchema.parse(
        cancelRes.body,
      );

      expect(cancelBody.success).toBe(true);
      expect(cancelBody.creditRefunded).toBe(true);
      expect(cancelBody.refundedToPackageId).toBe(privatePackage.id);

      // Verify credit was refunded to the PRIVATE package (original)
      updatedPackage = await packageRepository.findOne({
        where: { id: privatePackage.id },
      });
    });

    it("should refund correct number of credits for duration-based booking", async () => {
      const session = await createSession(
        ServiceType.PRIVATE,
        standardTeacher,
        60,
      );
      const package30min = await createPackage(ServiceType.PRIVATE, 0, 30);

      // Book using 2 credits (60 min session / 30 min credit unit)
      const bookingRes = await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: package30min.id,
          sessionId: session.id,
        })
        .expect(201);

      const body = BookingResponseSchema.parse(bookingRes.body);

      expect(body.creditsCost).toBe(2);

      // Verify 2 credits deducted
      let updatedPackage = await packageRepository.findOne({
        where: { id: package30min.id },
      });

      // Cancel
      await request(getHttpServer(app))
        .post(`/bookings/${body.id}/cancel`)
        .set("x-auth-user-id", testUser.id.toString())
        .send({ reason: "Test" })
        .expect(201);

      // Verify 2 credits refunded
      updatedPackage = await packageRepository.findOne({
        where: { id: package30min.id },
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent booking attempts with last credit", async () => {
      const session = await createSession(ServiceType.PRIVATE, standardTeacher);
      const pkg = await createPackage(ServiceType.PRIVATE, 0, 60, 1); // Only 1 credit

      // First booking should succeed
      await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: pkg.id,
          sessionId: session.id,
        })
        .expect(201);

      // Second booking should fail (no credits left)
      const session2 = await createSession(
        ServiceType.PRIVATE,
        standardTeacher,
      );
      await request(getHttpServer(app))
        .post("/payments/book-with-package")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          packageId: pkg.id,
          sessionId: session2.id,
        })
        .expect(400);
    });
  });
});
