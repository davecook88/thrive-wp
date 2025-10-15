import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import request from "supertest";
import jwt from "jsonwebtoken";
import { AppModule } from "../src/app.module.js";
import { resetDatabase } from "./utils/reset-db.js";
import { execInsert } from "./utils/query-helpers.js";

describe("Students API (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Match production routing where NestJS is served under /api/ (Nginx reverse
    // proxy adds this in the deployed/dev environment). Tests should mirror
    // that by registering the same global prefix.
    app.setGlobalPrefix("api");
    dataSource = moduleFixture.get(DataSource);
    await app.init();
    await resetDatabase(dataSource);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/students/me/upcoming", () => {
    let studentUserId: number;
    let studentId: number;
    let teacherUserId: number;
    let teacherId: number;
    let sessionId: number;
    let accessToken: string;

    beforeAll(async () => {
      // Clean up any existing test data

      // Create teacher user with high ID to avoid conflicts
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

      // Create student user with high ID to avoid conflicts
      studentUserId = 10000 + Math.floor(Math.random() * 90000);
      const studentEmail = `student-${Date.now()}@example.com`;
      // Ensure user record is clean, then insert user. The DB trigger will
      // auto-create a student row due to the migration's AFTER INSERT trigger
      // on the `user` table, so we must NOT manually insert into `student` to
      // avoid unique constraint collisions.
      await dataSource.query("DELETE FROM student WHERE user_id = ?", [
        studentUserId,
      ]);
      await dataSource.query("DELETE FROM user WHERE id = ?", [studentUserId]);
      await dataSource.query(
        "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [studentUserId, studentEmail, "Jane", "Smith"],
      );

      // Read back the student record created by the DB trigger
      const rows: Array<{ id: number }> = await dataSource.query(
        "SELECT id FROM student WHERE user_id = ?",
        [studentUserId],
      );
      if (!rows || rows.length === 0) {
        throw new Error("Expected student record to be created by DB trigger");
      }
      studentId = rows[0].id;

      // Create a session in the future
      sessionId = await execInsert(
        dataSource,
        "INSERT INTO session (type, teacher_id, start_at, end_at, capacity_max, status, visibility, requires_enrollment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          "PRIVATE",
          teacherId,
          "2025-12-01 10:00:00", // Future date
          "2025-12-01 11:00:00",
          1,
          "SCHEDULED",
          "PRIVATE",
          false,
        ],
      );

      // Create booking for the student
      await execInsert(
        dataSource,
        "INSERT INTO booking (session_id, student_id, status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [sessionId, studentId, "CONFIRMED"],
      );

      // Create JWT token for student
      const payload = {
        sub: studentUserId.toString(),
        email: studentEmail,
        name: "Jane Smith",
        firstName: "Jane",
        lastName: "Smith",
        roles: ["student"],
        sid: `test-session-${Date.now()}`,
        type: "access" as const,
      };

      const secret =
        process.env.SESSION_SECRET || "dev_insecure_secret_change_me";
      accessToken = jwt.sign(payload, secret, {
        algorithm: "HS256",
        expiresIn: "1d",
      });
    });

    it("should return upcoming sessions with correct teacher name", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/students/me/upcoming")
        .query({ limit: 5 })
        .set("Cookie", `thrive_sess=${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);

      const session = response.body[0];
      expect(session).toHaveProperty("id", sessionId);
      expect(session).toHaveProperty("teacherName", "John Doe"); // Should be concatenated first + last name
      expect(session).toHaveProperty("classType", "PRIVATE");
      expect(session).toHaveProperty("startAt");
      expect(session).toHaveProperty("endAt");
    });

    it("should respect limit parameter", async () => {
      // Create another future session
      const sessionId2 = await execInsert(
        dataSource,
        "INSERT INTO session (type, teacher_id, start_at, end_at, capacity_max, status, visibility, requires_enrollment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          "PRIVATE",
          teacherId,
          "2025-12-02 10:00:00", // Another future date
          "2025-12-02 11:00:00",
          1,
          "SCHEDULED",
          "PRIVATE",
          false,
        ],
      );

      await execInsert(
        dataSource,
        "INSERT INTO booking (session_id, student_id, status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [sessionId2, studentId, "CONFIRMED"],
      );

      const response = await request(app.getHttpServer())
        .get("/api/students/me/upcoming")
        .query({ limit: 1 })
        .set("Cookie", `thrive_sess=${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it("should return empty array for student with no upcoming sessions", async () => {
      // Create another student with no sessions
      const otherStudentUserId = await execInsert(
        dataSource,
        "INSERT INTO user (email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        ["other@example.com", "Bob", "Wilson"],
      );

      // Get the student record created by trigger for this user
      const otherRows: Array<{ id: number }> = await dataSource.query(
        "SELECT id FROM student WHERE user_id = ?",
        [otherStudentUserId],
      );
      if (!otherRows || otherRows.length === 0) {
        throw new Error(
          "Expected other student record to be created by DB trigger",
        );
      }
      const otherStudentId = otherRows[0].id;

      const otherPayload = {
        sub: otherStudentUserId.toString(),
        email: "other@example.com",
        name: "Bob Wilson",
        firstName: "Bob",
        lastName: "Wilson",
        roles: ["student"],
        sid: "test-session-id-2",
        type: "access" as const,
      };

      const secret =
        process.env.SESSION_SECRET || "dev_insecure_secret_change_me";
      const otherToken = jwt.sign(otherPayload, secret, {
        algorithm: "HS256",
        expiresIn: "1d",
      });

      const response = await request(app.getHttpServer())
        .get("/api/students/me/upcoming")
        .query({ limit: 5 })
        .set("Cookie", `thrive_sess=${otherToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });
});
