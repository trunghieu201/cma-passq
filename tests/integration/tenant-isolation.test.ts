import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/auth/me/route';
import { createTestRequest } from '../helpers/test-request';
import { signToken, withTenant } from '@/lib/auth';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userQuestionReview: {
      findMany: vi.fn(),
    },
  },
}));

describe('Tenant Isolation & Session Verification', () => {
  it('GET /api/auth/me trả về 401 nếu không có cookie', async () => {
    const req = createTestRequest('http://localhost:3000/api/auth/me');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me trả về thông tin người dùng an toàn', async () => {
    const validToken = signToken({ userId: 'user-tenant-1', email: 'user1@passq.vn' });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-tenant-1',
      email: 'user1@passq.vn',
      fullName: 'Tenant One',
      role: 'STUDENT',
      targetExamDate: null,
      createdAt: new Date(),
      stats: { totalAnswered: 42, totalCorrect: 35, streakDays: 3, dailyGoalCount: 20 },
    });

    const req = createTestRequest('http://localhost:3000/api/auth/me', {
      cookies: { token: validToken },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.id).toBe('user-tenant-1');
    expect(json.user.name).toBe('Tenant One');
    expect(json.user.stats.totalAnswered).toBe(42);
    expect(json.user.passwordHash).toBeUndefined(); // Never expose password hash
  });

  it('bảo vệ Tenant: withTenant ném lỗi nếu thiếu userId', async () => {
    await expect(withTenant('', async (id) => id)).rejects.toThrow('Tenant context invalid');
  });

  it('bảo vệ Tenant: withTenant thực thi khi có userId hợp lệ', async () => {
    const result = await withTenant('user-tenant-valid', async (id) => `tenant:${id}`);
    expect(result).toBe('tenant:user-tenant-valid');
  });
});
