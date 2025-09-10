import { config } from 'dotenv';
import { TestDataSource } from '../src/test-data-source.js';

// Load test environment variables
config({ path: '../.env.test' });

export default async () => {
  try {
    console.log('Initializing test database...');

    // Initialize test database connection
    await TestDataSource.initialize();
    console.log('Test database connected successfully');

    // For tests, use migrations instead of synchronization to ensure proper table order
    // This prevents foreign key constraint issues
    console.log('Running migrations...');
    await TestDataSource.runMigrations();
    console.log('Test database migrations completed');

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
