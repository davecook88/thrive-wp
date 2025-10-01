import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { DataSource } from 'typeorm';
import { resetDatabase } from './utils/reset-db.js';

describe('Database Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get(DataSource);
    await app.init();
    await resetDatabase(dataSource);
  }, 30000);

  afterEach(async () => {
    await app.close();
  });

  it('should connect to test database', () => {
    expect(dataSource.isInitialized).toBe(true);
    expect(dataSource.options.database).toBe('wordpress_test');
  });

  it('should have access to entities', () => {
    const entities = dataSource.entityMetadatas;
    expect(entities.length).toBeGreaterThan(0);
  });
});
