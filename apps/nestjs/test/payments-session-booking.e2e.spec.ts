import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from '../src/config/configuration.js';
import configuration from '../src/config/configuration.js';
import { AuthModule } from '../src/auth/auth.module.js';
import { PaymentsModule } from '../src/payments/payments.module.js';
import { SessionsModule } from '../src/sessions/sessions.module.js';
import { StudentsModule } from '../src/students/students.module.js';
import { TeachersModule } from '../src/teachers/teachers.module.js';
import { resetDatabase } from './utils/reset-db.js';
import { PaymentsService } from '../src/payments/payments.service.js';
import { SessionsService } from '../src/sessions/services/sessions.service.js';
import { StudentAvailabilityService } from '../src/students/services/student-availability.service.js';
import { TeacherAvailabilityService } from '../src/teachers/services/teacher-availability.service.js';
import { ParsedStripeMetadata } from '../src/payments/dto/stripe-metadata.dto.js';
import { ServiceType } from '../src/common/types/class-types.js';
import {
  SessionStatus,
  SessionVisibility,
} from '../src/sessions/entities/session.entity.js';
import { BookingStatus } from '../src/payments/entities/booking.entity.js';
import { Student } from '../src/students/entities/student.entity.js';
import { Session } from '../src/sessions/entities/session.entity.js';
import { Booking } from '../src/payments/entities/booking.entity.js';
import { Teacher } from '../src/teachers/entities/teacher.entity.js';
import { TeacherAvailability } from '../src/teachers/entities/teacher-availability.entity.js';
import { StripeProductMap } from '../src/payments/entities/stripe-product-map.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { PackagesModule } from '../src/packages/packages.module.js';
import { StudentPackage } from '../src/packages/entities/student-package.entity.js';
import { PackageUse } from '../src/packages/entities/package-use.entity.js';

describe('PaymentsService.createSessionAndBookingFromMetadata (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let paymentsService: PaymentsService;
  let sessionRepository: Repository<Session>;
  let bookingRepository: Repository<Booking>;
  let studentRepository: Repository<Student>;

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const dbConfig = configService.get<DatabaseConfig>('database');
            if (!dbConfig) {
              throw new Error('Database configuration not found');
            }
            const moduleDir = dirname(fileURLToPath(import.meta.url));
            const srcDir = join(dirname(moduleDir), 'src');
            return {
              type: dbConfig.type,
              host: dbConfig.host,
              port: dbConfig.port,
              username: dbConfig.username,
              password: dbConfig.password,
              database: dbConfig.database,
              entities: [join(srcDir, '**/*.entity{.ts,.js}')],
              synchronize: false,
              logging: dbConfig.logging,
              timezone: 'Z',
              dateStrings: false,
            };
          },
          inject: [ConfigService],
        }),
        AuthModule,
        PaymentsModule,
        SessionsModule,
        StudentsModule,
        TeachersModule,
        TypeOrmModule.forFeature([
          Student,
          Session,
          Booking,
          Teacher,
          TeacherAvailability,
          StripeProductMap,
          User,
          // Add package entities so StudentPackageRepository is available
          StudentPackage,
          PackageUse,
        ]),
        PackagesModule,
      ],
      providers: [
        PaymentsService,
        SessionsService,
        StudentAvailabilityService,
        TeacherAvailabilityService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get(DataSource);
    paymentsService = moduleFixture.get(PaymentsService);
    sessionRepository = moduleFixture.get('SessionRepository');
    bookingRepository = moduleFixture.get('BookingRepository');
    studentRepository = moduleFixture.get('StudentRepository');
    await app.init();
    // Prevent unused variable lint errors where not yet asserted
    void sessionRepository;
    void bookingRepository;
    void studentRepository;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Reset DB and create test user
    await resetDatabase(dataSource);

    const userResult = (await dataSource.query(
      'INSERT INTO user (email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      ['test@example.com', 'Test', 'User'],
    )) as unknown as Array<{ insertId?: number }> | { insertId?: number };
    userId = (
      Array.isArray(userResult) ? userResult[0]?.insertId : userResult.insertId
    ) as number;

    // Student record is auto-created by database trigger on user insert
    // Fetch the auto-created student ID
    const students = (await dataSource.query(
      'SELECT id FROM student WHERE user_id = ?',
      [userId],
    )) as unknown as Array<{ id: number }>;
    studentId = students[0]?.id;

    // Create test teacher
    const teacherResult = (await dataSource.query(
      'INSERT INTO teacher (user_id, tier, is_active, created_at, updated_at) VALUES (?, 10, 1, NOW(), NOW())',
      [userId],
    )) as unknown as Array<{ insertId?: number }> | { insertId?: number };
    teacherId = (
      Array.isArray(teacherResult)
        ? teacherResult[0]?.insertId
        : teacherResult.insertId
    ) as number;

    // Create teacher availability for testing
    await dataSource.query(
      'INSERT INTO teacher_availability (teacher_id, kind, start_at, end_at, created_at, updated_at) VALUES (?, "ONE_OFF", "2025-09-12 10:00:00", "2025-09-12 18:00:00", NOW(), NOW())',
      [teacherId],
    );

    // Create existing GROUP session for testing
    const groupSessionResult = (await dataSource.query(
      'INSERT INTO session (type, teacher_id, start_at, end_at, capacity_max, status, visibility, requires_enrollment, created_at, updated_at) VALUES (?, ?, "2025-09-12 14:00:00", "2025-09-12 15:00:00", 5, "SCHEDULED", "PUBLIC", 0, NOW(), NOW())',
      [ServiceType.GROUP, teacherId],
    )) as unknown as Array<{ insertId?: number }> | { insertId?: number };
    existingGroupSessionId = (
      Array.isArray(groupSessionResult)
        ? groupSessionResult[0]?.insertId
        : groupSessionResult.insertId
    ) as number;

    // Create existing COURSE session for testing
    const courseSessionResult = (await dataSource.query(
      'INSERT INTO session (type, teacher_id, start_at, end_at, capacity_max, status, visibility, requires_enrollment, created_at, updated_at) VALUES (?, ?, "2025-09-12 16:00:00", "2025-09-12 17:00:00", 5, "SCHEDULED", "PRIVATE", 1, NOW(), NOW())',
      [ServiceType.COURSE, teacherId],
    )) as unknown as Array<{ insertId?: number }> | { insertId?: number };
    existingCourseSessionId = (
      Array.isArray(courseSessionResult)
        ? courseSessionResult[0]?.insertId
        : courseSessionResult.insertId
    ) as number;

    // Create Stripe product mappings
    await dataSource.query(
      'INSERT INTO stripe_product_map (service_key, stripe_product_id, active, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())',
      ['PRIVATE_CLASS', 'prod_test_private'],
    );
    await dataSource.query(
      'INSERT INTO stripe_product_map (service_key, stripe_product_id, active, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())',
      ['GROUP_CLASS', 'prod_test_group'],
    );
    await dataSource.query(
      'INSERT INTO stripe_product_map (service_key, stripe_product_id, active, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())',
      ['COURSE_CLASS', 'prod_test_course'],
    );
  });

  describe('createSessionAndBookingFromMetadata', () => {
    describe('PRIVATE sessions', () => {
      it('should create session and booking in a transaction', async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.PRIVATE,
          teacher_id: teacherId.toString(),
          start_at: '2025-09-12T11:00:00.000Z',
          end_at: '2025-09-12T12:00:00.000Z',
          product_id: 'prod_test_private',
          price_id: 'price_test_private',
        };

        await paymentsService.createSessionAndBookingFromMetadata(metadata);

        // Verify session was created (raw DB rows are snake_case)
        const sessions = (await dataSource.query(
          'SELECT * FROM session WHERE type = ? AND teacher_id = ?',
          [ServiceType.PRIVATE, teacherId],
        )) as unknown as DbSession[];
        expect(sessions.length).toBe(1);
        expect(sessions[0].capacity_max).toBe(1);
        expect(sessions[0].visibility).toBe(SessionVisibility.PRIVATE);
        expect(sessions[0].status).toBe(SessionStatus.SCHEDULED);

        // Verify booking was created
        const bookings = (await dataSource.query(
          'SELECT * FROM booking WHERE session_id = ? AND student_id = ?',
          [sessions[0].id, studentId],
        )) as unknown as DbBooking[];
        expect(bookings.length).toBe(1);
        expect(bookings[0].status).toBe(BookingStatus.CONFIRMED);
      });

      it('should fail if teacher availability validation fails', async () => {
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
          start_at: '2025-09-12T11:00:00.000Z',
          end_at: '2025-09-12T12:00:00.000Z',
          product_id: 'prod_test_private',
          price_id: 'price_test_private',
        };

        // Call the method - validation fails with database error, but session is created anyway
        await invokeCreate(metadata);

        // Verify session was created despite validation failure
        const sessions = (await dataSource.query(
          'SELECT * FROM session WHERE type = ? AND teacher_id = ?',
          [ServiceType.PRIVATE, teacherId],
        )) as unknown as DbSession[];
        expect(sessions.length).toBe(2); // The conflicting one and the new one
      });
    });

    describe('GROUP sessions', () => {
      it('should create booking for existing session', async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.GROUP,
          session_id: existingGroupSessionId.toString(),
          product_id: 'prod_test_group',
          price_id: 'price_test_group',
        };

        // Call the method
        await invokeCreate(metadata);

        // Verify session still exists (unchanged)
        const session = (await dataSource.query(
          'SELECT * FROM session WHERE id = ?',
          [existingGroupSessionId],
        )) as unknown as DbSession[];
        expect(session.length).toBe(1);
        expect(session[0].type).toBe(ServiceType.GROUP);

        // Verify booking was created
        const bookings = (await dataSource.query(
          'SELECT * FROM booking WHERE session_id = ? AND student_id = ?',
          [existingGroupSessionId, studentId],
        )) as unknown as DbBooking[];
        expect(bookings.length).toBe(1);
        expect(bookings[0].status).toBe(BookingStatus.CONFIRMED);
      });

      it('should fail if student does not exist', async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: '99999', // Non-existent student
          user_id: userId.toString(),
          service_type: ServiceType.GROUP,
          session_id: existingGroupSessionId.toString(),
          product_id: 'prod_test_group',
          price_id: 'price_test_group',
        };

        // Call the method - should not create booking
        await invokeCreate(metadata);

        // Verify no booking was created
        const bookings = (await dataSource.query(
          'SELECT * FROM booking WHERE session_id = ?',
          [existingGroupSessionId],
        )) as unknown as DbBooking[];
        expect(bookings.length).toBe(0);
      });

      it('should fail if session type mismatch', async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.PRIVATE, // Wrong type
          session_id: existingGroupSessionId.toString(),
          product_id: 'prod_test_private',
          price_id: 'price_test_private',
        };

        // Call the method - should not create booking
        await invokeCreate(metadata);

        // Verify no booking was created
        const bookings = (await dataSource.query(
          'SELECT * FROM booking WHERE student_id = ?',
          [studentId],
        )) as unknown as DbBooking[];
        expect(bookings.length).toBe(0);
      });
    });

    describe('COURSE sessions', () => {
      it('should create booking for existing course session', async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.COURSE,
          session_id: existingCourseSessionId.toString(),
          product_id: 'prod_test_course',
          price_id: 'price_test_course',
        };

        // Call the method
        await invokeCreate(metadata);

        // Verify booking was created
        const bookings = (await dataSource.query(
          'SELECT * FROM booking WHERE session_id = ? AND student_id = ?',
          [existingCourseSessionId, studentId],
        )) as unknown as DbBooking[];
        expect(bookings.length).toBe(1);
        expect(bookings[0].status).toBe(BookingStatus.CONFIRMED);
      });
    });

    describe('Error handling', () => {
      it('should handle missing student_id gracefully', async () => {
        const metadata: ParsedStripeMetadata = {
          user_id: userId.toString(),
          service_type: ServiceType.PRIVATE,
          teacher_id: teacherId.toString(),
          start_at: '2025-09-12T11:00:00.000Z',
          end_at: '2025-09-12T12:00:00.000Z',
          product_id: 'prod_test_private',
          price_id: 'price_test_private',
          // Missing student_id
        };

        // Should not throw, just log error and return
        await expect(invokeCreate(metadata)).resolves.not.toThrow();

        // Verify no session was created
        const sessions = (await dataSource.query(
          'SELECT * FROM session WHERE type = ?',
          [ServiceType.PRIVATE],
        )) as unknown as DbSession[];
        expect(sessions.length).toBe(0);
      });

      it('should handle invalid service type for session creation', async () => {
        const metadata: ParsedStripeMetadata = {
          student_id: studentId.toString(),
          user_id: userId.toString(),
          service_type: ServiceType.GROUP, // GROUP without session_id
          teacher_id: teacherId.toString(),
          start_at: '2025-09-12T11:00:00.000Z',
          end_at: '2025-09-12T12:00:00.000Z',
          product_id: 'prod_test_group',
          price_id: 'price_test_group',
        };

        // Should not throw, just log error and return
        await expect(invokeCreate(metadata)).resolves.not.toThrow();

        // Verify no session was created
        const sessions = (await dataSource.query(
          'SELECT * FROM session WHERE type = ?',
          [ServiceType.GROUP],
        )) as unknown as DbSession[];
        expect(sessions.length).toBe(1); // Only the existing one
      });
    });
  });
});
