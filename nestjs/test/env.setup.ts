// Load test-specific environment variables before any application modules import configuration.
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
// Use process.cwd() as the test root directory. Avoid import.meta so this file can run
// as an early Jest setupFile without requiring ESM runtime flags.
const currentDir = process.cwd();
const rootDir = path.resolve(currentDir, '..');
const envTestPath = path.join(rootDir, '.env.test');

if (fs.existsSync(envTestPath)) {
  config({ path: envTestPath });
} else {
  // Fallback: still load default env if needed
  config();
}

// Ensure NODE_ENV is test
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Provide a default explicit test DB name if not already set
if (process.env.NODE_ENV === 'test' && !process.env.DB_DATABASE_TEST) {
  process.env.DB_DATABASE_TEST = 'wordpress_test';
}

// Force DB host to localhost for tests if not explicitly provided
if (process.env.NODE_ENV === 'test' && !process.env.DB_HOST) {
  process.env.DB_HOST = 'localhost';
}
