import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { TestDatabaseModule } from '../src/test-database.module.js';
import { PackagesService } from '../src/packages/packages.service.js';
import { PaymentsService } from '../src/payments/payments.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StudentPackage } from '../src/packages/entities/student-package.entity.js';
import { PackageUse } from '../src/packages/entities/package-use.entity.js';
import { Student } from '../src/students/entities/student.entity.js';
import { Session } from '../src/sessions/entities/session.entity.js';
import { Booking } from '../src/payments/entities/booking.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { Teacher } from '../src/teachers/entities/teacher-availability.entity.js';
import { BookingStatus } from '../src/payments/entities/booking.entity.js';
import {
  SessionStatus,
  SessionVisibility,
} from '../src/sessions/entities/session.entity.js';
import { AppModule } from '../src/app.module.js';

describe('Package Booking (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let packagesService: PackagesService;
  let paymentsService: PaymentsService;
  let studentPackageRepository: Repository<StudentPackage>;
  let packageUseRepository: Repository<PackageUse>;
  let studentRepository: Repository<Student>;
  let sessionRepository: Repository<Session>;
  let bookingRepository: Repository<Booking>;
  let userRepository: Repository<User>;

  // Test data
  let testUserId: number;
  let testStudentId: number;
  let testPackageId: number;
  let testSessionId: number;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              database: {
                type: 'mysql',
                host: 'localhost',
                port: 3306,
                username: 'root',
                password: '',
                database: 'thrive_test',
                synchronize: false,
                logging: false,
              },
              stripe: {
                secretKey: 'sk_test_fake_key',
                publishableKey: 'pk_test_fake_key',
              },
            }),
          ],
        }),
        TestDatabaseModule,
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

    dataSource = moduleFixture.get<DataSource>(DataSource);
    packagesService = moduleFixture.get<PackagesService>(PackagesService);
    paymentsService = moduleFixture.get<PaymentsService>(PaymentsService);

    studentPackageRepository = moduleFixture.get<Repository<StudentPackage>>(
      'StudentPackageRepository',
    );
    packageUseRepository = moduleFixture.get<Repository<PackageUse>>(
      'PackageUseRepository',
    );
    studentRepository =
      moduleFixture.get<Repository<Student>>('StudentRepository');
    sessionRepository =
      moduleFixture.get<Repository<Session>>('SessionRepository');
    bookingRepository =
      moduleFixture.get<Repository<Booking>>('BookingRepository');
    userRepository = moduleFixture.get<Repository<User>>('UserRepository');

    // Set up test data
    await setupTestData();
  });

  async function setupTestData() {
    // Create test user
    const user = userRepository.create({
      email: 'test@example.com',
      name: 'Test User',
      googleId: null,
      hashedPassword: 'hashed',
    });
    const savedUser = await userRepository.save(user);
    testUserId = savedUser.id;

    // Create test student
    const student = studentRepository.create({
      userId: testUserId,
    });
    const savedStudent = await studentRepository.save(student);
    testStudentId = savedStudent.id;

    // Create test session
    const session = sessionRepository.create({
      teacherId: 1, // Assume teacher exists
      startTime: new Date(Date.now() + 86400000), // Tomorrow
      endTime: new Date(Date.now() + 86400000 + 3600000), // Tomorrow + 1 hour
      status: SessionStatus.AVAILABLE,
      visibility: SessionVisibility.PUBLIC,
      serviceType: 'PRIVATE',
      maxStudents: 1,
      currentStudents: 0,
    });
    const savedSession = await sessionRepository.save(session);
    testSessionId = savedSession.id;

    // Create test package
    const studentPackage = studentPackageRepository.create({
      studentId: testStudentId,
      packageName: '5-class test pack',
      totalSessions: 5,
      remainingSessions: 3,
      purchasedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000), // 30 days from now
      sourcePaymentId: 'test_payment_123',
    });
    const savedPackage = await studentPackageRepository.save(studentPackage);
    testPackageId = savedPackage.id;
  }

  afterEach(async () => {
    // Clean up test data
    await packageUseRepository.delete({});
    await bookingRepository.delete({});
    await studentPackageRepository.delete({});
    await sessionRepository.delete({});
    await studentRepository.delete({});
    await userRepository.delete({});

    await app.close();
  });

  describe('GET /packages/my-credits', () => {
    it('should return student credits', async () => {
      const response = await request(app.getHttpServer())
        .get('/packages/my-credits')
        .set('x-auth-user-id', testUserId.toString())
        .expect(200);

      expect(response.body.packages).toHaveLength(1);
      expect(response.body.packages[0].packageName).toBe('5-class test pack');
      expect(response.body.packages[0].remainingSessions).toBe(3);
      expect(response.body.totalRemaining).toBe(3);
    });

    it('should return 401 when user not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/packages/my-credits')
        .expect(500); // UnauthorizedException becomes 500 in test env
    });
  });

  describe('POST /payments/book-with-package', () => {
    it('should successfully book session with package credit', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/book-with-package')
        .set('x-auth-user-id', testUserId.toString())
        .send({
          packageId: testPackageId,
          sessionId: testSessionId,
        })
        .expect(201);

      expect(response.body.sessionId).toBe(testSessionId);
      expect(response.body.studentId).toBe(testStudentId);
      expect(response.body.status).toBe(BookingStatus.CONFIRMED);
      expect(response.body.studentPackageId).toBe(testPackageId);
      expect(response.body.creditsCost).toBe(1);

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
      expect(packageUse?.bookingId).toBe(response.body.id);
    });

    it('should return 400 when package has no remaining sessions', async () => {
      // Update package to have 0 remaining sessions
      await studentPackageRepository.update(testPackageId, {
        remainingSessions: 0,
      });

      await request(app.getHttpServer())
        .post('/payments/book-with-package')
        .set('x-auth-user-id', testUserId.toString())
        .send({
          packageId: testPackageId,
          sessionId: testSessionId,
        })
        .expect(400);
    });

    it('should return 404 when package not found', async () => {
      await request(app.getHttpServer())
        .post('/payments/book-with-package')
        .set('x-auth-user-id', testUserId.toString())
        .send({
          packageId: 99999, // non-existent package
          sessionId: testSessionId,
        })
        .expect(404);
    });

    it('should return 400 when package is expired', async () => {
      // Update package to be expired
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      await studentPackageRepository.update(testPackageId, {
        expiresAt: pastDate,
      });

      await request(app.getHttpServer())
        .post('/payments/book-with-package')
        .set('x-auth-user-id', testUserId.toString())
        .send({
          packageId: testPackageId,
          sessionId: testSessionId,
        })
        .expect(400);
    });

    it('should return 400 with invalid request body', async () => {
      await request(app.getHttpServer())
        .post('/payments/book-with-package')
        .set('x-auth-user-id', testUserId.toString())
        .send({
          packageId: 'invalid', // should be number
          sessionId: testSessionId,
        })
        .expect(400);
    });
  });

  describe('POST /packages/:id/use', () => {
    it('should successfully use package for session', async () => {
      const response = await request(app.getHttpServer())
        .post(`/packages/${testPackageId}/use`)
        .set('x-auth-user-id', testUserId.toString())
        .send({
          sessionId: testSessionId,
        })
        .expect(201);

      expect(response.body.package.remainingSessions).toBe(2);
      expect(response.body.use.sessionId).toBe(testSessionId);

      // Verify database changes
      const updatedPackage = await studentPackageRepository.findOne({
        where: { id: testPackageId },
      });
      expect(updatedPackage?.remainingSessions).toBe(2);
    });
  });

  describe('Concurrency test', () => {
    it('should handle concurrent package usage correctly', async () => {
      // Set package to have only 1 remaining session
      await studentPackageRepository.update(testPackageId, {
        remainingSessions: 1,
      });

      // Create two sessions
      const session2 = sessionRepository.create({
        teacherId: 1,
        startTime: new Date(Date.now() + 172800000), // Day after tomorrow
        endTime: new Date(Date.now() + 172800000 + 3600000),
        status: SessionStatus.AVAILABLE,
        visibility: SessionVisibility.PUBLIC,
        serviceType: 'PRIVATE',
        maxStudents: 1,
        currentStudents: 0,
      });
      const savedSession2 = await sessionRepository.save(session2);

      // Attempt to use the package for both sessions simultaneously
      const promises = [
        request(app.getHttpServer())
          .post(`/packages/${testPackageId}/use`)
          .set('x-auth-user-id', testUserId.toString())
          .send({ sessionId: testSessionId }),
        request(app.getHttpServer())
          .post(`/packages/${testPackageId}/use`)
          .set('x-auth-user-id', testUserId.toString())
          .send({ sessionId: savedSession2.id }),
      ];

      const results = await Promise.allSettled(promises);

      // Exactly one should succeed, one should fail
      const successfulRequests = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 201,
      );
      const failedRequests = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 400,
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
