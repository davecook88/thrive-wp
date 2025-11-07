import { describe, beforeAll, afterAll, it, expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import request from "supertest";
import jwt from "jsonwebtoken";
import { getHttpServer } from "./utils/get-httpserver.js";
import { StripeProductService } from "../src/common/services/stripe-product.service.js";
import { PaymentsService } from "../src/payments/payments.service.js";
import { AppModule } from "../src/app.module.js";
import { resetDatabase } from "./utils/reset-db.js";
import { execInsert } from "./utils/query-helpers.js";
import { runMigrations } from "./setup.js";
import Stripe from "stripe";

describe("Course Cohort Enrollment (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let moduleFixture: TestingModule;
  beforeAll(async () => {
    await runMigrations();

    // Provide a mocked StripeProductService so tests don't call external Stripe
    const mockStripeService = {
      getStripeClient: () => ({
        prices: {
          list: () => ({ data: [{ id: "price_test_1" }] }),
        },
        checkout: {
          sessions: {
            create: () => ({
              id: "cs_test_1",
              url: "https://checkout.test/1",
            }),
          },
        },
      }),
    } as unknown as StripeProductService;

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StripeProductService)
      .useValue(mockStripeService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    dataSource = moduleFixture.get(DataSource);
    await app.init();
    await resetDatabase(dataSource);
  }, 30000);

  afterAll(async () => {
    if (app && typeof app.close === "function") {
      await app.close();
    }
  });

  describe("POST /api/course-programs/:code/cohorts/:cohortId/enroll", () => {
    let studentUserId: number;
    let studentId: number;
    let teacherUserId: number;
    let teacherId: number;
    let courseProgramId: number;
    let courseStepId: number;
    let groupClassId: number;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let sessionId: number;
    let courseStepOptionId: number;
    let cohortId: number;
    let accessToken: string;

    beforeAll(async () => {
      // Create teacher
      teacherUserId = 10000 + Math.floor(Math.random() * 90000);
      await dataSource.query(
        "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [teacherUserId, `teacher-${Date.now()}@example.com`, "John", "Doe"],
      );

      teacherId = await execInsert(
        dataSource,
        "INSERT INTO teacher (user_id, tier, bio, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [teacherUserId, 10, "Test teacher", true],
      );

      // Create student
      studentUserId = 10000 + Math.floor(Math.random() * 90000);
      const studentEmail = `student-${Date.now()}@example.com`;
      await dataSource.query("DELETE FROM student WHERE user_id = ?", [
        studentUserId,
      ]);
      await dataSource.query("DELETE FROM user WHERE id = ?", [studentUserId]);
      await dataSource.query(
        "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [studentUserId, studentEmail, "Jane", "Smith"],
      );

      const rows: Array<{ id: number }> = await dataSource.query(
        "SELECT id FROM student WHERE user_id = ?",
        [studentUserId],
      );
      if (!rows || rows.length === 0) {
        throw new Error("Expected student record to be created by DB trigger");
      }
      studentId = rows[0].id;

      // Create JWT token for student (match shape expected by StudentGuard)
      const payload = {
        sub: studentUserId.toString(),
        email: studentEmail,
        name: "Jane Smith",
        firstName: "Jane",
        lastName: "Smith",
        roles: ["student"],
        sid: `test-session-${Date.now()}`,
        type: "access",
      } as const;

      const secret =
        process.env.SESSION_SECRET || "dev_insecure_secret_change_me";
      accessToken = jwt.sign(payload, secret, {
        algorithm: "HS256",
        expiresIn: "1h",
      });

      // Create course program
      courseProgramId = await execInsert(
        dataSource,
        "INSERT INTO course_program (code, title, description, timezone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        ["TEST101", "Test Course", "A test course", "America/New_York", true],
      );

      // Create a stripe_product_map for this course so the controller can find a product mapping
      await execInsert(
        dataSource,
        `INSERT INTO stripe_product_map (service_key, stripe_product_id, active, scope_type, scope_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          `course_TEST101_${Date.now()}`,
          `prod_test_${courseProgramId}`,
          true,
          "course",
          courseProgramId,
        ],
      );

      // Create course step
      courseStepId = await execInsert(
        dataSource,
        "INSERT INTO course_step (course_program_id, step_order, label, title, description, is_required, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [courseProgramId, 1, "Step 1", "First Step", "The first step", true],
      );

      // Create group class
      groupClassId = await execInsert(
        dataSource,
        "INSERT INTO group_class (title, description, capacity_max, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        ["Test Group Class", "A test group class", 6, true],
      );

      // Create session for group class (OneToOne relationship)
      sessionId = await execInsert(
        dataSource,
        "INSERT INTO session (type, teacher_id, group_class_id, start_at, end_at, capacity_max, status, visibility, requires_enrollment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          "GROUP",
          teacherId,
          groupClassId,
          "2025-12-01 10:00:00",
          "2025-12-01 11:00:00",
          6,
          "SCHEDULED",
          "PUBLIC",
          true,
        ],
      );

      // Create course step option linking step to group class
      courseStepOptionId = await execInsert(
        dataSource,
        "INSERT INTO course_step_option (course_step_id, group_class_id, is_active, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [courseStepId, groupClassId, true],
      );

      // Create cohort
      cohortId = await execInsert(
        dataSource,
        "INSERT INTO course_cohort (course_program_id, name, description, start_date, end_date, timezone, max_enrollment, current_enrollment, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          courseProgramId,
          "Test Cohort",
          "A test cohort",
          "2025-11-01",
          "2025-12-31",
          "America/New_York",
          20,
          0,
          true,
        ],
      );

      // Assign session to cohort
      await execInsert(
        dataSource,
        "INSERT INTO course_cohort_session (cohort_id, course_step_id, course_step_option_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [cohortId, courseStepId, courseStepOptionId],
      );
    });

    it("should successfully enroll a student in a cohort", async () => {
      // Call enroll endpoint — it should return a Stripe checkout session (mocked)
      const response = await request(getHttpServer(app))
        .post(`/api/course-programs/TEST101/cohorts/${cohortId}/enroll`)
        .set("Cookie", `thrive_sess=${accessToken}`)
        .set("x-auth-user-id", studentUserId.toString())
        .send({})
        .expect(201);

      // Verify response is the checkout session (mock)
      expect(response.body).toHaveProperty("sessionId", "cs_test_1");
      expect(response.body).toHaveProperty("url", "https://checkout.test/1");

      // Simulate Stripe webhook: payment_intent.succeeded -> PaymentsService should create StudentPackage + increment cohort
      const paymentsService =
        moduleFixture.get<PaymentsService>(PaymentsService);

      const fakePaymentIntent = {
        id: `pi_test_${Date.now()}`,
        amount_received: 1000,
        currency: "usd",
        metadata: {
          product_type: "course_enrollment",
          course_program_id: courseProgramId.toString(),
          cohort_id: cohortId.toString(),
          student_id: studentId.toString(),
          stripe_product_map_id: String(
            (
              await dataSource.query<
                {
                  id: number;
                }[]
              >(
                "SELECT id FROM stripe_product_map WHERE scope_type = ? AND scope_id = ?",
                ["course", courseProgramId],
              )
            )[0].id,
          ),
          course_code: "TEST101",
          cohort_name: "Test Cohort",
        },
      } as unknown as Stripe.PaymentIntentSucceededEvent["data"]["object"];
      await paymentsService.handleStripeEvent({
        type: "payment_intent.succeeded",
        data: { object: fakePaymentIntent },
      } as unknown as Stripe.Event);

      // Verify a student_package (course enrollment) was created
      const packages = await dataSource.query<
        {
          id: number;
          student_id: number;
          stripe_product_map_id: number;
        }[]
      >(
        "SELECT * FROM student_package WHERE student_id = ? AND stripe_product_map_id = ?",
        [studentId, fakePaymentIntent.metadata.stripe_product_map_id],
      );
      expect(packages.length).toBeGreaterThan(0);

      // Verify cohort current_enrollment was incremented
      const cohorts = await dataSource.query<
        {
          id: number;
          current_enrollment: number;
        }[]
      >("SELECT current_enrollment FROM course_cohort WHERE id = ?", [
        cohortId,
      ]);
      expect(cohorts[0].current_enrollment).toBe(1);
    });

    it("should return 401 when not authenticated", async () => {
      await request(getHttpServer(app))
        .post(`/api/course-programs/TEST101/cohorts/${cohortId}/enroll`)
        .expect(401);
    });

    it("should return 404 when cohort does not exist", async () => {
      await request(getHttpServer(app))
        .post(`/api/course-programs/TEST101/cohorts/99999/enroll`)
        .set("Cookie", `thrive_sess=${accessToken}`)
        .set("x-auth-user-id", studentUserId.toString())
        .send({})
        .expect(404);
    });

    it("should return 404 when course code does not match", async () => {
      await request(getHttpServer(app))
        .post(`/api/course-programs/WRONG/cohorts/${cohortId}/enroll`)
        .set("Cookie", `thrive_sess=${accessToken}`)
        .set("x-auth-user-id", studentUserId.toString())
        .send({})
        .expect(404);
    });
  });

  describe("GET /api/course-programs/:code/cohorts/:cohortId (cohort detail)", () => {
    let teacherUserId: number;
    let teacherId: number;
    let courseProgramId: number;
    let courseStepId: number;
    let groupClassId: number;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let sessionId: number;
    let courseStepOptionId: number;
    let cohortId: number;

    beforeAll(async () => {
      // Create teacher
      teacherUserId = 20000 + Math.floor(Math.random() * 90000);
      await dataSource.query(
        "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [teacherUserId, `teacher2-${Date.now()}@example.com`, "Bob", "Teacher"],
      );

      teacherId = await execInsert(
        dataSource,
        "INSERT INTO teacher (user_id, tier, bio, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [teacherUserId, 10, "Test teacher 2", true],
      );

      // Create course program
      courseProgramId = await execInsert(
        dataSource,
        "INSERT INTO course_program (code, title, description, timezone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [
          "TEST202",
          "Test Course 2",
          "Another test course",
          "America/New_York",
          true,
        ],
      );

      // Create course step
      courseStepId = await execInsert(
        dataSource,
        "INSERT INTO course_step (course_program_id, step_order, label, title, description, is_required, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [courseProgramId, 1, "Week 1", "Introduction", "Intro week", true],
      );

      // Create group class
      groupClassId = await execInsert(
        dataSource,
        "INSERT INTO group_class (title, description, capacity_max, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        ["Monday Morning Class", "Morning session", 8, true],
      );

      // Create session for group class
      sessionId = await execInsert(
        dataSource,
        "INSERT INTO session (type, teacher_id, group_class_id, start_at, end_at, capacity_max, status, visibility, requires_enrollment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          "GROUP",
          teacherId,
          groupClassId,
          "2025-12-02 09:00:00",
          "2025-12-02 10:00:00",
          8,
          "SCHEDULED",
          "PUBLIC",
          true,
        ],
      );

      // Create course step option
      courseStepOptionId = await execInsert(
        dataSource,
        "INSERT INTO course_step_option (course_step_id, group_class_id, is_active, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [courseStepId, groupClassId, true],
      );

      // Create cohort
      cohortId = await execInsert(
        dataSource,
        "INSERT INTO course_cohort (course_program_id, name, description, start_date, end_date, timezone, max_enrollment, current_enrollment, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          courseProgramId,
          "Winter 2025",
          "Winter cohort",
          "2025-12-01",
          "2026-02-28",
          "America/New_York",
          15,
          0,
          true,
        ],
      );

      // Assign session to cohort
      await execInsert(
        dataSource,
        "INSERT INTO course_cohort_session (cohort_id, course_step_id, course_step_option_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [cohortId, courseStepId, courseStepOptionId],
      );
    });

    it("should return cohort details with sessions", async () => {
      const response: {
        body: {
          id: number;
          courseCode: string;
          courseTitle: string;
          name: string;
          sessions: Array<{
            stepLabel: string;
            stepTitle: string;
            groupClassName: string;
            sessionDateTime: string;
            durationMinutes: number;
          }>;
        };
      } = await request(getHttpServer(app))
        .get(`/api/course-programs/TEST202/cohorts/${cohortId}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", cohortId);
      expect(response.body).toHaveProperty("courseCode", "TEST202");
      expect(response.body).toHaveProperty("courseTitle", "Test Course 2");
      expect(response.body).toHaveProperty("name", "Winter 2025");
      expect(response.body).toHaveProperty("sessions");
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBe(1);

      const session = response.body.sessions[0];
      expect(session).toHaveProperty("stepLabel", "Week 1");
      expect(session).toHaveProperty("stepTitle", "Introduction");
      expect(session).toHaveProperty("groupClassName", "Monday Morning Class");
      expect(session).toHaveProperty("sessionDateTime");
      expect(session.sessionDateTime).toBe("2025-12-02T09:00:00.000Z");
      expect(session).toHaveProperty("durationMinutes", 60);
    });

    it("should return 404 when cohort does not exist", async () => {
      await request(getHttpServer(app))
        .get(`/api/course-programs/TEST202/cohorts/99999`)
        .expect(404);
    });
  });
});
