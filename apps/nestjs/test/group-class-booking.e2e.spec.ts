import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DataSource, Repository } from "typeorm";
import { resetDatabase } from "./utils/reset-db";
import { User } from "../src/users/entities/user.entity";
import { Student } from "../src/students/entities/student.entity";
import { Teacher } from "../src/teachers/entities/teacher.entity";
import { GroupClass } from "../src/group-classes/entities/group-class.entity";
import { Booking } from "../src/payments/entities/booking.entity";
import { Level } from "../src/levels/entities/level.entity";

describe("Group Class Booking (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let studentRepository: Repository<Student>;
  let teacherRepository: Repository<Teacher>;
  let groupClassRepository: Repository<GroupClass>;
  let bookingRepository: Repository<Booking>;
  let levelRepository: Repository<Level>;

  let testUser: User;
  let testStudent: Student;
  let testTeacher: Teacher;
  let testLevel: Level;

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
    testStudent = await studentRepository.save({
      userId: testUser.id,
    });
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
    testLevel = await levelRepository.findOne({ where: { code: "A1" } });
  }

  it("should create a group class, generate sessions, and see them as available", async () => {
    // Create a group class
    const groupClassRes = await request(app.getHttpServer())
      .post("/group-classes")
      .send({
        title: "Test Group Class",
        description: "A test group class",
        levelId: testLevel.id,
        capacityMax: 10,
        teacherIds: [testTeacher.id],
        primaryTeacherId: testTeacher.id,
        rrule: "FREQ=WEEKLY;COUNT=5;BYDAY=MO",
        startDate: "2025-01-06",
        sessionStartTime: "10:00",
        sessionDuration: 60,
      })
      .expect(201);

    // Generate sessions
    await request(app.getHttpServer())
      .post(`/group-classes/${groupClassRes.body.id}/generate-sessions`)
      .expect(201);

    // Check if sessions are available
    const response = await request(app.getHttpServer())
      .get("/group-classes/available")
      .expect(200);

    expect(response.body.sessions).toBeInstanceOf(Array);
    expect(response.body.sessions.length).toBeGreaterThan(0);
  });

  describe("POST /bookings", () => {
    it("should allow a student to book a group class session", async () => {
      // 1. Create a group class
      const groupClassRes = await request(app.getHttpServer())
        .post("/group-classes")
        .send({
          title: "Movable Type",
          description: "A test group class",
          levelId: testLevel.id,
          capacityMax: 10,
          teacherIds: [testTeacher.id],
          primaryTeacherId: testTeacher.id,
          rrule: "FREQ=WEEKLY;COUNT=1;BYDAY=MO",
          startDate: "2025-01-06",
          sessionStartTime: "10:00",
          sessionDuration: 60,
        })
        .expect(201);

      // 2. Generate sessions
      await request(app.getHttpServer())
        .post(`/group-classes/${groupClassRes.body.id}/generate-sessions`)
        .expect(201);

      // 3. Get available sessions
      const availableSessionsRes = await request(app.getHttpServer())
        .get("/group-classes/available")
        .expect(200);

      const sessionToBook = availableSessionsRes.body.sessions[0];
      expect(sessionToBook).toBeDefined();

      // 4. Book the session as the student
      const bookingRes = await request(app.getHttpServer())
        .post("/bookings")
        .set("x-auth-user-id", testUser.id.toString())
        .send({
          sessionId: sessionToBook.sessionId,
          // No payment intent or package, assuming free for now
        })
        .expect(201);

      expect(bookingRes.body.bookingId).toBeDefined();
      expect(bookingRes.body.status).toEqual("CONFIRMED");

      // 5. Verify in database
      const booking = await bookingRepository.findOne({
        where: { id: bookingRes.body.bookingId },
      });
      expect(booking).not.toBeNull();
      expect(booking.studentId).toEqual(testStudent.id);
      expect(booking.sessionId).toEqual(sessionToBook.sessionId);
    });
    const groupClassRes = await request(app.getHttpServer())
      .post("/group-classes")
      .send({
        title: "Test Group Class",
        levelId: testLevel.id,
        capacityMax: 5,
        teacherIds: [testTeacher.id],
        primaryTeacherId: testTeacher.id,
        rrule: "FREQ=WEEKLY;COUNT=1;BYDAY=TU",
        startDate: "2025-01-07",
        sessionStartTime: "11:00",
        sessionDuration: 60,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/group-classes/${groupClassRes.body.id}/generate-sessions`)
      .expect(201);
    const availableSessionsRes = await request(app.getHttpServer())
      .get("/group-classes/available")
      .expect(200);
    const sessionToBook = availableSessionsRes.body.sessions[0];

    await request(app.getHttpServer())
      .post("/bookings")
      .set("x-auth-user-id", testUser.id.toString())
      .send({ sessionId: sessionToBook.sessionId })
      .expect(201);

    const updatedSessionsRes = await request(app.getHttpServer())
      .get("/group-classes/available")
      .expect(200);
    const updatedSession = updatedSessionsRes.body.sessions.find(
      (s) => s.sessionId === sessionToBook.sessionId,
    );

    expect(updatedSession.enrolledCount).toBe(1);
    expect(updatedSession.availableSpots).toBe(4);
  });

  it("should not allow booking a full group class session", async () => {
    const groupClassRes = await request(app.getHttpServer())
      .post("/group-classes")
      .send({
        title: "Full Class",
        levelId: testLevel.id,
        capacityMax: 1,
        teacherIds: [testTeacher.id],
        primaryTeacherId: testTeacher.id,
        rrule: "FREQ=WEEKLY;COUNT=1;BYDAY=WE",
        startDate: "2025-01-08",
        sessionStartTime: "12:00",
        sessionDuration: 60,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/group-classes/${groupClassRes.body.id}/generate-sessions`)
      .expect(201);
    const availableSessionsRes = await request(app.getHttpServer())
      .get("/group-classes/available")
      .expect(200);
    const sessionToBook = availableSessionsRes.body.sessions[0];

    // First student books the only spot
    await request(app.getHttpServer())
      .post("/bookings")
      .set("x-auth-user-id", testUser.id.toString())
      .send({ sessionId: sessionToBook.sessionId })
      .expect(201);

    // Second student tries to book
    const secondUser = await userRepository.save({
      email: "student2@test.com",
      firstName: "Second",
      lastName: "Student",
      passwordHash: "hash",
    });
    await request(app.getHttpServer())
      .post("/bookings")
      .set("x-auth-user-id", secondUser.id.toString())
      .send({ sessionId: sessionToBook.sessionId })
      .expect(400); // Expect a bad request because class is full
  });
});
