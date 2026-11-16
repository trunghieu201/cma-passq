/**
 * Playwright Custom Authentication Fixtures
 * Provides pre-authenticated pages, isolated multi-tenant pages, and clean unauthenticated pages.
 * Reference: TEST_INFRA.md, PROJECT.md
 */
import { test as base, Page, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';
import { PRIMARY_TEST_USER, SECONDARY_TEST_USER, TestUser } from './mock-users';
import { seedDefaultTestUsers } from './test-db';
import { prisma } from '../../src/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'passq-cma-production-secret-jwt-key-2026';

// Type definitions for custom fixtures
export interface AuthFixtures {
  /** Page authenticated as the primary student user */
  authenticatedPage: Page;
  /** Page authenticated as the secondary student user (for tenant isolation tests) */
  secondaryAuthenticatedPage: Page;
  /** Clean unauthenticated page with no cookies or sessions */
  unauthenticatedPage: Page;
  /** Primary test user data */
  primaryUser: TestUser;
  /** Secondary test user data */
  secondaryUser: TestUser;
}

/**
 * Creates a valid signed JWT session cookie for the specified user
 */
export function createMockAuthCookie(user: TestUser, baseURL: string) {
  const url = new URL(baseURL || 'http://localhost:3000');
  const role = user.role === 'ADMIN' ? 'ADMIN' : 'STUDENT';

  const mockToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    name: 'token',
    value: mockToken,
    domain: url.hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax' as const,
  };
}

export const test = base.extend<AuthFixtures>({
  primaryUser: async ({}, use) => {
    await use(PRIMARY_TEST_USER);
  },

  secondaryUser: async ({}, use) => {
    await use(SECONDARY_TEST_USER);
  },

  authenticatedPage: async ({ browser, baseURL }, use) => {
    await seedDefaultTestUsers(prisma);

    const context = await browser.newContext({
      baseURL: baseURL || 'http://localhost:3000',
    });

    const cookie = createMockAuthCookie(PRIMARY_TEST_USER, baseURL || 'http://localhost:3000');
    await context.addCookies([cookie]);

    const page = await context.newPage();
    await use(page);

    await context.close();
  },

  secondaryAuthenticatedPage: async ({ browser, baseURL }, use) => {
    await seedDefaultTestUsers(prisma);

    const context = await browser.newContext({
      baseURL: baseURL || 'http://localhost:3000',
    });

    const cookie = createMockAuthCookie(SECONDARY_TEST_USER, baseURL || 'http://localhost:3000');
    await context.addCookies([cookie]);

    const page = await context.newPage();
    await use(page);

    await context.close();
  },

  unauthenticatedPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({
      baseURL: baseURL || 'http://localhost:3000',
    });

    const page = await context.newPage();
    await use(page);

    await context.close();
  },
});

export { expect };
