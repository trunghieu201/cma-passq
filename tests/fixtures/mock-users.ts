/**
 * Mock Users and Static Credential Fixtures
 * Reference: TEST_INFRA.md, PROJECT.md
 */

export interface TestUserPlan {
  examDate: string;
  targetScore: number;
  weeklyHours: number;
  mode: 'standard' | 'fast-track';
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role?: 'USER' | 'ADMIN';
  plan?: TestUserPlan;
}

/** Primary student account for standard E2E and integration tests */
export const PRIMARY_TEST_USER: TestUser = {
  id: 'test-user-primary-001',
  email: 'student@passq.test',
  password: 'Password123!',
  name: 'Học Viên Test 1',
  role: 'USER',
  plan: {
    examDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    targetScore: 420,
    weeklyHours: 15,
    mode: 'standard',
  },
};

/** Secondary isolated account to verify strict tenant isolation */
export const SECONDARY_TEST_USER: TestUser = {
  id: 'test-user-isolated-002',
  email: 'isolated_student@passq.test',
  password: 'Password123!',
  name: 'Học Viên Test 2',
  role: 'USER',
  plan: {
    examDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    targetScore: 400,
    weeklyHours: 10,
    mode: 'fast-track',
  },
};

/** Administrator account for administrative endpoints */
export const ADMIN_TEST_USER: TestUser = {
  id: 'test-user-admin-003',
  email: 'admin@passq.test',
  password: 'AdminPassword123!',
  name: 'Quản Trị Viên PassQ',
  role: 'ADMIN',
};

/**
 * Returns formatted Bearer header value
 */
export function formatBearer(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Returns headers object with authorization token
 */
export function getTestAuthHeader(token: string): Record<string, string> {
  return {
    Authorization: formatBearer(token),
  };
}
