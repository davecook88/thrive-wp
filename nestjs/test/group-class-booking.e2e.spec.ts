import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Group Class Booking (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should create a group class, generate sessions, and see them as available', async () => {
    // Create a group class
    const groupClass = await request(app.getHttpServer())
      .post('/group-classes')
      .send({
        title: 'Test Group Class',
        description: 'A test group class',
        levelId: 1,
        capacityMax: 10,
        teacherIds: [1],
        primaryTeacherId: 1,
        rrule: 'FREQ=WEEKLY;COUNT=5',
        startDate: '2025-01-01',
        endDate: '2025-02-01',
        sessionStartTime: '10:00',
        sessionDuration: 60,
      })
      .expect(201);

    // Generate sessions
    await request(app.getHttpServer())
      .post(`/group-classes/${groupClass.body.id}/generate-sessions`)
      .expect(201);

    // Check if sessions are available
    const response = await request(app.getHttpServer())
      .get('/group-classes/available')
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
  });
});
