import { describe, beforeAll, afterAll, it, expect } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ExecutionContext } from "@nestjs/common";
import { DataSource } from "typeorm";
import request from "supertest";
import jwt from "jsonwebtoken";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";
import { AppModule } from "../src/app.module.js";
import { AdminGuard } from "../src/auth/admin.guard.js";
import { StudentGuard } from "../src/auth/student.guard.js";
import { TeacherGuard } from "../src/auth/teacher.guard.js";
import { resetDatabase } from "./utils/reset-db.js";
import { execInsert } from "./utils/query-helpers.js";
import { runMigrations } from "./setup.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

describe("Course Materials (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    await runMigrations();

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 100, email: "admin@example.com", roles: ["admin"] };
          return true;
        },
      })
      .overrideGuard(StudentGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = req.user || { id: 200, email: "student@example.com", roles: ["student"] };
          return true;
        },
      })
      .overrideGuard(TeacherGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = req.user || { id: 600, email: "teacher@example.com", roles: ["teacher"] };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    await resetDatabase(dataSource);
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  let adminToken: string;
  let adminUserId: number;
  let courseProgramId: number;
  let courseStepId: number;

  beforeAll(async () => {
    // Create Admin User
    adminUserId = 100;
    await dataSource.query(
      "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [adminUserId, "admin@example.com", "Admin", "User"],
    );

    adminToken = jwt.sign(
      {
        sub: adminUserId.toString(),
        email: "admin@example.com",
        roles: ["admin"],
      },
      process.env.SESSION_SECRET || "dev_secret",
    );

    // Create Course Program
    courseProgramId = await execInsert(
      dataSource,
      "INSERT INTO course_program (code, title, description, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      ["TEST-101", "Test Course", "Description"],
    );

    // Create Course Step
    courseStepId = await execInsert(
      dataSource,
      "INSERT INTO course_step (course_program_id, step_order, label, title, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [courseProgramId, 1, "STEP-1", "Step 1"],
    );
  });

  describe("POST /course-materials", () => {
    it("should create a file material", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post("/course-materials")
        .set("Cookie", [`thrive_sess=${adminToken}`])
        .send({
          courseStepId,
          title: "Introduction PDF",
          type: "file",
          content: "https://example.com/intro.pdf",
          order: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: "Introduction PDF",
        type: "file",
        content: "https://example.com/intro.pdf",
        order: 1,
        createdById: adminUserId,
      });
    });

    it("should create a question material", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post("/course-materials")
        .set("Cookie", [`thrive_sess=${adminToken}`])
        .send({
          courseStepId,
          title: "Quiz 1",
          type: "question",
          order: 2,
          question: {
            questionText: "What is 2+2?",
            questionType: "multiple_choice",
            options: { a: "3", b: "4" },
          },
        });

      if (response.status !== 201) {
        console.log(
          "Create question failed:",
          JSON.stringify(response.body, null, 2),
        );
      }
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: "Quiz 1",
        type: "question",
        order: 2,
      });
    });

    it("should fail if question data is missing for question type", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post("/course-materials")
        .set("Cookie", [`thrive_sess=${adminToken}`])
        .send({
          courseStepId,
          title: "Bad Quiz",
          type: "question",
          order: 3,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /course-materials/step/:stepId", () => {
    it("should return all materials for a step", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .get(`/course-materials/step/${courseStepId}`)
        .set("Cookie", [`thrive_sess=${adminToken}`]);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect((response.body as Any)[0].title).toBe("Introduction PDF");
      expect((response.body as Any)[1].title).toBe("Quiz 1");
    });
  });

  describe("PATCH /course-materials/:id", () => {
    it("should update a material", async () => {
      // Get the first material
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const materials = await request(app.getHttpServer() as any)
        .get(`/course-materials/step/${courseStepId}`)
        .set("Cookie", [`thrive_sess=${adminToken}`]);

      const materialId = (materials.body as Any)[0].id;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .patch(`/course-materials/${materialId}`)
        .set("Cookie", [`thrive_sess=${adminToken}`])
        .send({
          title: "Updated PDF",
        });

      expect(response.status).toBe(200);
      expect((response.body as Any).title).toBe("Updated PDF");
    });

    it("should update a question material", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const materials = await request(app.getHttpServer() as any)
        .get(`/course-materials/step/${courseStepId}`)
        .set("Cookie", [`thrive_sess=${adminToken}`]);

      const questionMaterial = (materials.body as Any).find(
        (m: Any) => m.type === "question",
      );
      const materialId = questionMaterial.id;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .patch(`/course-materials/${materialId}`)
        .set("Cookie", [`thrive_sess=${adminToken}`])
        .send({
          question: {
            questionText: "What is 3+3?",
          },
        });

      expect(response.status).toBe(200);
      // Verify question text updated
      expect((response.body as Any).question.questionText).toBe("What is 3+3?");
    });
  });

  describe("DELETE /course-materials/:id", () => {
    it("should delete a material", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const materials = await request(app.getHttpServer() as any)
        .get(`/course-materials/step/${courseStepId}`)
        .set("Cookie", [`thrive_sess=${adminToken}`]);

      const materialId = (materials.body as Any)[0].id;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .delete(`/course-materials/${materialId}`)
        .set("Cookie", [`thrive_sess=${adminToken}`]);

      expect(response.status).toBe(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const check = await request(app.getHttpServer() as any)
        .get(`/course-materials/${materialId}`)
        .set("Cookie", [`thrive_sess=${adminToken}`]);

      expect(check.status).toBe(404);
    });
  });

  // Student Progress Tracking Tests
  describe("POST /course-materials/progress", () => {
    let studentToken: string;
    let studentUserId: number;
    let studentPackageId: number;
    let materialId: number;

    beforeAll(async () => {
      // Create a student user
      studentUserId = 200;
      await dataSource.query(
        "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [studentUserId, "student@example.com", "Student", "User"],
      );

      studentToken = jwt.sign(
        {
          sub: studentUserId.toString(),
          email: "student@example.com",
          roles: ["student"],
        },
        process.env.SESSION_SECRET || "dev_secret",
      );

      // Create a student package
      studentPackageId = await execInsert(
        dataSource,
        "INSERT INTO student_package (student_id, package_id, enrollment_date, created_at, updated_at) VALUES (?, ?, NOW(), NOW(), NOW())",
        [studentUserId, 1], // Assuming package 1 exists or create it
      );

      // Get a material ID from the previously created materials
      const materials = await dataSource.query(
        "SELECT id FROM course_step_material LIMIT 1",
      );
      materialId = materials[0].id;
    });

    it("should update material progress to in_progress", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post("/course-materials/progress")
        .set("Cookie", [`thrive_sess=${studentToken}`])
        .send({
          courseStepMaterialId: materialId,
          studentPackageId,
          status: "in_progress",
        });

      expect(response.status).toBe(201);
      expect((response.body as Any).status).toBe("in_progress");
      expect((response.body as Any).studentId).toBe(studentUserId);
    });

    it("should update material progress to completed", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post("/course-materials/progress")
        .set("Cookie", [`thrive_sess=${studentToken}`])
        .send({
          courseStepMaterialId: materialId,
          studentPackageId,
          status: "completed",
        });

      expect(response.status).toBe(201);
      expect((response.body as Any).status).toBe("completed");
      expect((response.body as Any).completedAt).toBeTruthy();
    });
  });

  describe("GET /course-materials/progress/:courseStepId", () => {
    let studentToken: string;
    let studentUserId: number;

    beforeAll(async () => {
      studentUserId = 300;
      await dataSource.query(
        "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [studentUserId, "student2@example.com", "Student", "Two"],
      );

      studentToken = jwt.sign(
        {
          sub: studentUserId.toString(),
          email: "student2@example.com",
          roles: ["student"],
        },
        process.env.SESSION_SECRET || "dev_secret",
      );
    });

    it("should get progress for a course step", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .get(`/course-materials/progress/${courseStepId}`)
        .set("Cookie", [`thrive_sess=${studentToken}`]);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // Student Answer Submission Tests
  describe("POST /course-materials/answers/submit", () => {
    let studentToken: string;
    let studentUserId: number;
    let questionId: number;

    beforeAll(async () => {
      studentUserId = 400;
      await dataSource.query(
        "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [studentUserId, "student3@example.com", "Student", "Three"],
      );

      studentToken = jwt.sign(
        {
          sub: studentUserId.toString(),
          email: "student3@example.com",
          roles: ["student"],
        },
        process.env.SESSION_SECRET || "dev_secret",
      );

      // Get a question ID from the material we created
      const questions = await dataSource.query(
        "SELECT id FROM material_question LIMIT 1",
      );
      if (questions.length > 0) {
        questionId = questions[0].id;
      }
    });

    it("should submit an answer to a multiple choice question", async () => {
      if (!questionId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const materials = await request(app.getHttpServer() as any)
          .get(`/course-materials/step/${courseStepId}`)
          .set("Cookie", [`thrive_sess=${studentToken}`]);

        const questionMaterial = (materials.body as Any).find(
          (m: Any) => m.type === "question",
        );
        if (!questionMaterial || !questionMaterial.questions?.length) {
          // Skip this test if no question exists
          return;
        }
        questionId = questionMaterial.questions[0].id;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post("/course-materials/answers/submit")
        .set("Cookie", [`thrive_sess=${studentToken}`])
        .send({
          questionId,
          answerContent: "a",
        });

      expect(response.status).toBe(201);
      expect((response.body as Any).answerContent).toBe("a");
      expect((response.body as Any).studentId).toBe(studentUserId);
    });

    it("should fail if question does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post("/course-materials/answers/submit")
        .set("Cookie", [`thrive_sess=${studentToken}`])
        .send({
          questionId: 99999,
          answerContent: "test",
        });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /course-materials/my-answers", () => {
    let studentToken: string;
    let studentUserId: number;

    beforeAll(async () => {
      studentUserId = 500;
      await dataSource.query(
        "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [studentUserId, "student4@example.com", "Student", "Four"],
      );

      studentToken = jwt.sign(
        {
          sub: studentUserId.toString(),
          email: "student4@example.com",
          roles: ["student"],
        },
        process.env.SESSION_SECRET || "dev_secret",
      );
    });

    it("should get all answers submitted by the student", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .get("/course-materials/my-answers")
        .set("Cookie", [`thrive_sess=${studentToken}`]);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // Teacher Assessment Tests
  describe("GET /course-materials/assessment/queue", () => {
    let teacherToken: string;
    let teacherUserId: number;

    beforeAll(async () => {
      teacherUserId = 600;
      await dataSource.query(
        "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [teacherUserId, "teacher@example.com", "Teacher", "User"],
      );

      teacherToken = jwt.sign(
        {
          sub: teacherUserId.toString(),
          email: "teacher@example.com",
          roles: ["teacher"],
        },
        process.env.SESSION_SECRET || "dev_secret",
      );
    });

    it("should get pending answers for assessment", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .get("/course-materials/assessment/queue")
        .set("Cookie", [`thrive_sess=${teacherToken}`]);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("POST /course-materials/assessment/answers/:answerId", () => {
    let teacherToken: string;
    let teacherUserId: number;
    let answerId: number;

    beforeAll(async () => {
      teacherUserId = 700;
      await dataSource.query(
        "INSERT INTO user (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [teacherUserId, "teacher2@example.com", "Teacher", "Two"],
      );

      teacherToken = jwt.sign(
        {
          sub: teacherUserId.toString(),
          email: "teacher2@example.com",
          roles: ["teacher"],
        },
        process.env.SESSION_SECRET || "dev_secret",
      );

      // Create an answer to assess
      const answers = await dataSource.query(
        "SELECT id FROM student_answer WHERE status = 'pending_assessment' LIMIT 1",
      );
      if (answers.length > 0) {
        answerId = answers[0].id;
      }
    });

    it("should assess an answer as approved", async () => {
      if (!answerId) {
        // Skip if no pending answer exists
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post(`/course-materials/assessment/answers/${answerId}`)
        .set("Cookie", [`thrive_sess=${teacherToken}`])
        .send({
          status: "approved",
          feedback: "Great answer!",
        });

      expect(response.status).toBe(201);
      expect((response.body as Any).status).toBe("approved");
      expect((response.body as Any).feedback).toBe("Great answer!");
      expect((response.body as Any).assessedById).toBe(teacherUserId);
    });

    it("should assess an answer as needs_revision", async () => {
      if (!answerId) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post(`/course-materials/assessment/answers/${answerId}`)
        .set("Cookie", [`thrive_sess=${teacherToken}`])
        .send({
          status: "needs_revision",
          feedback: "Please try again.",
        });

      expect(response.status).toBe(201);
      expect((response.body as Any).status).toBe("needs_revision");
    });

    it("should fail if answer does not exist", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post("/course-materials/assessment/answers/99999")
        .set("Cookie", [`thrive_sess=${teacherToken}`])
        .send({
          status: "approved",
          feedback: "Test",
        });

      expect(response.status).toBe(404);
    });
  });
});
