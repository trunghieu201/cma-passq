/**
 * Vitest integration test setup file: tests/integration/setup.ts
 * Configures test environment variables and lifecycle hooks.
 */
import path from 'path';
import { beforeAll, afterAll } from 'vitest';

// Configure test environment variables with absolute database path
(process.env as any).NODE_ENV = 'test';
const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'passq-cma-production-secret-jwt-key-2026';
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

beforeAll(() => {
  // Global test initialization if needed
});

afterAll(() => {
  // Global test teardown if needed
});
