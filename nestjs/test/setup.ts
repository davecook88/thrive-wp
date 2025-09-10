import { config } from 'dotenv';
import { TestDataSource } from '../src/test-data-source.js';

// Load test environment variables
config({ path: '../.env.test' });

export default async () => {
  try {
    console.log('Initializing test database...');
    console.log('DB Config:', {
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE_TEST,
      user: process.env.DB_USERNAME,
    });

    // Initialize test database connection
    await TestDataSource.initialize();
    console.log('Test database connected successfully');

    // Check if migrations are loaded
    const migrations = TestDataSource.migrations;
    console.log(`Found ${migrations.length} migrations`);

    // For tests, use migrations instead of synchronization to ensure proper table order
    // This prevents foreign key constraint issues
    console.log('Running migrations...');
    await TestDataSource.runMigrations();
    console.log('Test database migrations completed');

    // Verify tables exist
    const tables = await TestDataSource.query('SHOW TABLES');
    console.log(
      'Tables created:',
      tables.map((t: any) => Object.values(t)[0]),
    );

    // Clean up after all tests
    global.afterAll(async () => {
      try {
        await TestDataSource.destroy();
        console.log('Test database connection closed');
      } catch (error) {
        console.error('Error closing test database connection:', error);
      }
    });
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
};
