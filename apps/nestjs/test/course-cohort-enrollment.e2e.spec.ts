import { describe, beforeAll, afterAll, it, expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import request from "supertest";
import jwt from "jsonwebtoken";
import { AppModule } from "../src/app.module.js";
import { resetDatabase } from "./utils/reset-db.js";
import { execInsert } from "./utils/query-helpers.js";
import { runMigrations } from "./setup.js";

describe("Course Cohort Enrollment (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    await runMigrations();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    dataSource = moduleFixture.get(DataSource);
    await app.init();
    await resetDatabase(dataSource);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/course-programs/:code/cohorts/:cohortId/enroll", () => {
    let studentUserId: number;
    let studentId: number;
    let teacherUserId: number;
    let teacherId: number;
    let courseProgramId: number;
    let courseStepId: number;
    let groupClassId: number;
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

      // Create JWT token for student
      accessToken = jwt.sign(
        { userId: studentUserId, role: "student" },
        process.env.SESSION_SECRET || "test-secret",
        { expiresIn: "1h" },
      );

      // Create course program
      courseProgramId = await execInsert(
        dataSource,
        "INSERT INTO course_program (code, title, description, timezone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        ["TEST101", "Test Course", "A test course", "America/New_York", true],
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
      const response = await request(app.getHttpServer())
        .post(`/api/course-programs/TEST101/cohorts/${cohortId}/enroll`)
        .set("Cookie", [`thrive_sess=${accessToken}`])
        .expect(201);

      // Verify response contains cohort details
      expect(response.body).toHaveProperty("id", cohortId);
      expect(response.body).toHaveProperty("courseCode", "TEST101");
      expect(response.body).toHaveProperty("name", "Test Cohort");
      expect(response.body).toHaveProperty("sessions");
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBe(1);

      // Verify session details
      const session = response.body.sessions[0];
      expect(session).toHaveProperty("stepLabel", "Step 1");
      expect(session).toHaveProperty("stepTitle", "First Step");
      expect(session).toHaveProperty("groupClassName", "Test Group Class");
      expect(session).toHaveProperty("sessionDateTime");

      // Verify enrollment was created in database
      const enrollments = await dataSource.query(
        "SELECT * FROM course_enrollment WHERE cohort_id = ? AND student_id = ?",
        [cohortId, studentId],
      );
      expect(enrollments.length).toBe(1);
      expect(enrollments[0].status).toBe("active");

      // Verify cohort current_enrollment was incremented
      const cohorts = await dataSource.query(
        "SELECT current_enrollment FROM course_cohort WHERE id = ?",
        [cohortId],
      );
      expect(cohorts[0].current_enrollment).toBe(1);
    });

    it("should return 401 when not authenticated", async () => {
      await request(app.getHttpServer())
        .post(`/api/course-programs/TEST101/cohorts/${cohortId}/enroll`)
        .expect(401);
    });

    it("should return 404 when cohort does not exist", async () => {
      await request(app.getHttpServer())
        .post(`/api/course-programs/TEST101/cohorts/99999/enroll`)
        .set("Cookie", [`thrive_sess=${accessToken}`])
        .expect(404);
    });

    it("should return 404 when course code does not match", async () => {
      await request(app.getHttpServer())
        .post(`/api/course-programs/WRONG/cohorts/${cohortId}/enroll`)
        .set("Cookie", [`thrive_sess=${accessToken}`])
        .expect(404);
    });
  });

  describe("GET /api/course-programs/:code/cohorts/:cohortId (cohort detail)", () => {
    let teacherUserId: number;
    let teacherId: number;
    let courseProgramId: number;
    let courseStepId: number;
    let groupClassId: number;
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
        ["TEST202", "Test Course 2", "Another test course", "America/New_York", true],
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
      const response = await request(app.getHttpServer())
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
      await request(app.getHttpServer())
        .get(`/api/course-programs/TEST202/cohorts/99999`)
        .expect(404);
    });
  });
});
