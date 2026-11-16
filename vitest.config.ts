import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest Integration Test Configuration for cma_passq_web
 * Reference: TEST_INFRA.md, PROJECT.md
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    /* Expose describe, it, expect, vi globally */
    globals: true,

    /* Default environment is node for API route handlers, Prisma DB queries, and scoring math */
    environment: 'node',

    /* Target integration test directories */
    include: [
      'tests/integration/**/*.test.ts',
      'tests/integration/**/*.spec.ts',
      'tests/**/*.test.ts',
    ],

    /* Explicitly exclude Playwright E2E suites and build output */
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      'tests/e2e/**',
    ],

    /* Run integration test files sequentially to avoid SQLite WAL concurrency locking */
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    /* Test timeouts (allow DB ingestion queries over 7,609 questions) */
    testTimeout: 30 * 1000,
    hookTimeout: 30 * 1000,

    /* Test environment setup (env vars, DB connection helpers) */
    setupFiles: ['./tests/integration/setup.ts'],

    /* Coverage configuration */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**',
        'src/app/api/**',
      ],
      exclude: [
        'src/**/*.d.ts',
        'tests/**',
      ],
    },
  },
});
