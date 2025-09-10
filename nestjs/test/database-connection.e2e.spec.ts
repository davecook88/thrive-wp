import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestDatabaseModule } from '../src/test-database.module.js';

describe('Database Connection (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestDatabaseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should initialize the app with test database', () => {
    expect(app).toBeDefined();
  });
});
