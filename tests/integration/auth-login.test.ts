import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { createTestRequest } from '../helpers/test-request';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Auth Login & Logout Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('đăng nhập thành công với mật khẩu chính xác', async () => {
    const hashedPassword = await hashPassword('CorrectPassword123');
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-uuid-1',
      email: 'student@passq.vn',
      passwordHash: hashedPassword,
      fullName: 'Nguyen Van A',
      role: 'STUDENT',
    });

    const req = createTestRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: { email: 'student@passq.vn', password: 'CorrectPassword123' },
    });

    const res = await loginPOST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.user.email).toBe('student@passq.vn');
    expect(json.user.name).toBe('Nguyen Van A');
    expect(json.token).toBeDefined();
    expect(res.headers.get('set-cookie')).toContain('token=');
  });

  it('từ chối nếu sai mật khẩu (401)', async () => {
    const hashedPassword = await hashPassword('CorrectPassword123');
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-uuid-1',
      email: 'student@passq.vn',
      passwordHash: hashedPassword,
      fullName: 'Nguyen Van A',
      role: 'STUDENT',
    });

    const req = createTestRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: { email: 'student@passq.vn', password: 'WrongPassword' },
    });

    const res = await loginPOST(req);
    expect(res.status).toBe(401);
  });

  it('từ chối nếu tài khoản không tồn tại (401)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const req = createTestRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: { email: 'nonexistent@passq.vn', password: 'Password123' },
    });

    const res = await loginPOST(req);
    expect(res.status).toBe(401);
  });

  it('đăng xuất xoá cookie phiên', async () => {
    const res = await logoutPOST();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('Max-Age=0');
  });
});
