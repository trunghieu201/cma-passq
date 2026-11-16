import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import { createTestRequest } from '../helpers/test-request';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('đăng ký thành công và cấp cookie HTTP-only', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({
      id: 'user-uuid-1',
      email: 'student@passq.vn',
      fullName: 'Nguyen Van A',
      role: 'STUDENT',
      createdAt: new Date(),
    });

    const req = createTestRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: {
        email: 'student@passq.vn',
        password: 'Password123!',
        name: 'Nguyen Van A',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.user.email).toBe('student@passq.vn');
    expect(json.user.name).toBe('Nguyen Van A');
    expect(json.token).toBeDefined();

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('token=');
    expect(setCookie).toContain('HttpOnly');
  });

  it('từ chối nếu email đã tồn tại (409 Conflict)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'existing-id' });

    const req = createTestRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: {
        email: 'duplicate@passq.vn',
        password: 'Password123!',
        name: 'Nguyen Van B',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('đã được đăng ký');
  });

  it('từ chối mật khẩu quá ngắn (400 Bad Request)', async () => {
    const req = createTestRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: {
        email: 'test@passq.vn',
        password: '123',
        name: 'Nguyen Van C',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('từ chối họ tên rỗng (400 Bad Request)', async () => {
    const req = createTestRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: {
        email: 'test@passq.vn',
        password: 'Password123!',
        name: '   ',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('từ chối email không hợp lệ (400 Bad Request)', async () => {
    const req = createTestRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'Nguyen Van D',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
