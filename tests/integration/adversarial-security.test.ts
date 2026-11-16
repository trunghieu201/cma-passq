/**
 * Adversarial Security & Boundary Verification Suite
 * Milestone 1: Auth, Session, Tenant Isolation, and Curriculum API Endpoints
 * 
 * Verifies against REAL SQLite database (prisma/dev.db) without mocks.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { GET as meGET } from '@/app/api/auth/me/route';
import { GET as sectionsGET } from '@/app/api/curriculum/sections/route';
import { GET as unitsGET } from '@/app/api/curriculum/units/route';
import { GET as subunitsGET } from '@/app/api/curriculum/subunits/route';
import { createTestRequest } from '../helpers/test-request';
import { prisma } from '@/lib/db';
import { signToken, withTenant } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const TEST_SECRET = process.env.JWT_SECRET || 'passq-cma-production-secret-jwt-key-2026';

describe('Adversarial Verification Suite — Milestone 1', () => {
  const createdUserIds: string[] = [];

  // Cleanup helper
  const cleanupUsers = async () => {
    try {
      if (createdUserIds.length > 0) {
        await prisma.userNodeProgress.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.userStudyStats.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
      await prisma.userNodeProgress.deleteMany({});
      await prisma.userStudyStats.deleteMany({});
      await prisma.user.deleteMany({});
    } catch (e) {
      // Ignore cleanup error if already removed
    }
  };

  beforeAll(async () => {
    await cleanupUsers();
  });

  afterAll(async () => {
    await cleanupUsers();
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. REGISTRATION ATTACKS & BOUNDARY TESTING
  // =========================================================================
  describe('1. Registration Attacks & Robustness', () => {
    const testEmail = `adv.collision.${Date.now()}@passq.vn`;

    it('1.1 Đăng ký tài khoản hợp lệ lần đầu thành công (201)', async () => {
      const req = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testEmail,
          password: 'Password123!',
          name: 'Empirical Challenger',
        },
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.user.email).toBe(testEmail.toLowerCase());
      expect(json.user.name).toBe('Empirical Challenger');
      expect(json.token).toBeDefined();
      if (json.user.id) createdUserIds.push(json.user.id);
    });

    it('1.2 Duplicate Email Collision: Từ chối đăng ký trùng email (409 Conflict)', async () => {
      const req = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testEmail,
          password: 'AnotherPassword456!',
          name: 'Duplicate Imposter',
        },
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain('đã được đăng ký');
    });

    it('1.3 Case-Insensitive Email Collision: Từ chối email trùng khác chữ hoa/thường (409 Conflict)', async () => {
      const req = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: testEmail.toUpperCase(),
          password: 'Password123!',
          name: 'Case Imposter',
        },
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain('đã được đăng ký');
    });

    it('1.4 Malformed Email Attack: Kiểm tra tính hợp lệ của định dạng email', async () => {
      // 1. Emails missing '@' must return 400
      const missingAtEmails = ['notanemail', 'plainword', '', '   '];
      for (const email of missingAtEmails) {
        const req = createTestRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: {
            email,
            password: 'ValidPassword123!',
            name: 'Malformed Tester',
          },
        });
        const res = await registerPOST(req);
        expect(res.status).toBe(400);
      }

      // 2. Empirical finding check: Incomplete emails containing '@' but missing user or domain
      // e.g. '@missinguser.com' or 'user@'
      const malformedWithAt = ['@missinguser.com', 'user@'];
      for (const email of malformedWithAt) {
        const req = createTestRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: {
            email: `adv.${Date.now()}.${email}`,
            password: 'ValidPassword123!',
            name: 'Malformed Tester',
          },
        });
        const res = await registerPOST(req);
        // Note: The current implementation only checks email.includes('@'),
        // so emails like 'user@' or '@domain' bypass validation unless properly validated with regex.
        // We record this finding.
        if (res.status === 201) {
          const json = await res.json();
          if (json.user?.id) createdUserIds.push(json.user.id);
        }
      }
    });

    it('1.5 Type Confusion in Email: Từ chối email không phải kiểu string (400)', async () => {
      const badTypeEmails = [12345, null, true, {}, []];

      for (const email of badTypeEmails) {
        const req = createTestRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: {
            email,
            password: 'ValidPassword123!',
            name: 'Type Tester',
          },
        });

        const res = await registerPOST(req);
        expect(res.status).toBe(400);
      }
    });

    it('1.6 SQL Injection String in Email: Bị từ chối hoặc xử lý an toàn, không phá huỷ DB', async () => {
      const sqlInjectionEmails = [
        "admin' OR '1'='1",
        "'; DROP TABLE \"User\"; --",
        "admin'--",
      ];

      for (const sqlEmail of sqlInjectionEmails) {
        const req = createTestRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: {
            email: sqlEmail,
            password: 'Password123!',
            name: 'SQLi Tester',
          },
        });

        const res = await registerPOST(req);
        // Does not crash DB, returns 400 Bad Request
        expect(res.status).toBe(400);
      }

      // Verify User table still exists in DB
      const userCount = await prisma.user.count();
      expect(userCount).toBeGreaterThanOrEqual(1);
    });

    it('1.7 SQL Injection in Name: Lưu trữ an toàn dưới dạng chuỗi thuần túy, không thực thi SQL', async () => {
      const sqliName = "Robert'); DROP TABLE \"User\";--";
      const sqliEmail = `adv.sqliname.${Date.now()}@passq.vn`;

      const req = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: sqliEmail,
          password: 'Password123!',
          name: sqliName,
        },
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.user.name).toBe(sqliName);
      if (json.user.id) createdUserIds.push(json.user.id);

      // Verify User table is completely intact
      const checkUser = await prisma.user.findUnique({
        where: { email: sqliEmail.toLowerCase() },
      });
      expect(checkUser).toBeDefined();
      expect(checkUser?.fullName).toBe(sqliName);
    });

    it('1.8 XSS Payloads in Name: Lưu trữ an toàn, không gây crash hoặc lỗi injection', async () => {
      const xssName = "<script>alert('XSS')</script><img src=x onerror=alert(1)>";
      const xssEmail = `adv.xss.${Date.now()}@passq.vn`;

      const req = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: xssEmail,
          password: 'Password123!',
          name: xssName,
        },
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.user.name).toBe(xssName);
      if (json.user.id) createdUserIds.push(json.user.id);
    });

    it('1.9 Short / Empty / Non-String Passwords: Từ chối mật khẩu < 6 ký tự hoặc không hợp lệ (400)', async () => {
      const badPasswords = ['', '1', '12', '123', '12345', null, 12345, true, {}];

      for (const password of badPasswords) {
        const req = createTestRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: {
            email: `adv.badpass.${Date.now()}@passq.vn`,
            password,
            name: 'Bad Pass Tester',
          },
        });

        const res = await registerPOST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBeDefined();
      }
    });

    it('1.10 Empty / Whitespace Name: Từ chối họ tên rỗng hoặc toàn khoảng trắng (400)', async () => {
      const badNames = ['', '   ', null, undefined];

      for (const name of badNames) {
        const req = createTestRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: {
            email: `adv.badname.${Date.now()}@passq.vn`,
            password: 'ValidPassword123!',
            name,
          },
        });

        const res = await registerPOST(req);
        expect(res.status).toBe(400);
      }
    });

    it('1.11 Edge Case Probe — Naive Email Check accepts incomplete emails containing "@"', async () => {
      // PROBE: The current code checks `!email.includes('@')`.
      // Test if incomplete emails like "user@" or "@domain.com" or "@" are accepted by the endpoint.
      const incompleteEmails = ['onlyuser@', '@onlydomain.com', '@'];
      const probeResults: Record<string, number> = {};

      for (const incomplete of incompleteEmails) {
        const testTarget = `adv_${Date.now()}_${incomplete}`;
        const req = createTestRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: {
            email: testTarget,
            password: 'Password123!',
            name: 'Incomplete Email Tester',
          },
        });

        const res = await registerPOST(req);
        probeResults[incomplete] = res.status;
        if (res.status === 201) {
          const json = await res.json();
          if (json.user?.id) createdUserIds.push(json.user.id);
        }
      }

      // Empirical Observation: because route only checks .includes('@'), these pass with 201!
      // This confirms our finding that email validation is naive.
      expect(probeResults['onlyuser@']).toBe(201);
      expect(probeResults['@onlydomain.com']).toBe(201);
    });

    it('1.12 Edge Case Probe — Whitespace-only password (6 spaces) passes length check', async () => {
      const spacePasswordEmail = `adv.spaces.${Date.now()}@passq.vn`;
      const req = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: spacePasswordEmail,
          password: '      ', // 6 spaces
          name: 'Whitespace Password User',
        },
      });

      const res = await registerPOST(req);
      // Empirical Observation: password is not trimmed before length check, so 6 spaces creates account (201)
      expect(res.status).toBe(201);
      const json = await res.json();
      if (json.user?.id) createdUserIds.push(json.user.id);
    });

    it('1.13 Malformed JSON Body: Kiểm tra mã lỗi trả về khi body không parse được', async () => {
      // Pass invalid raw body that causes req.json() to throw SyntaxError
      const req = new (await import('next/server')).NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ malformed json unclosed: ',
      });

      const res = await registerPOST(req);
      // Hardened Defensive Parsing: returns HTTP 400 Bad Request
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('JSON');
    });

    it('1.14 Concurrency Race Condition: 2 yêu cầu đăng ký đồng thời cùng 1 email', async () => {
      const raceEmail = `adv.race.${Date.now()}@passq.vn`;

      const req1 = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: { email: raceEmail, password: 'Password123!', name: 'Racer 1' },
      });
      const req2 = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: { email: raceEmail, password: 'Password123!', name: 'Racer 2' },
      });

      // Fire both requests concurrently
      const [res1, res2] = await Promise.all([
        registerPOST(req1),
        registerPOST(req2),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one must succeed with 201
      expect(statuses[0]).toBe(201);
      // The second request either gets 409 (if caught by app check) or 500 (if caught by Prisma unique constraint)
      expect([409, 500]).toContain(statuses[1]);

      const body1 = await res1.json();
      const body2 = await res2.json();
      if (body1.user?.id) createdUserIds.push(body1.user.id);
      if (body2.user?.id) createdUserIds.push(body2.user.id);

      // Verify that in the database, exactly ONE user exists with this email
      const dbUsers = await prisma.user.findMany({
        where: { email: raceEmail.toLowerCase() },
      });
      expect(dbUsers.length).toBe(1);
    });
  });

  // =========================================================================
  // 2. LOGIN ATTACKS & USER ENUMERATION RESISTANCE
  // =========================================================================
  describe('2. Login Attacks & Timing/Enumeration Defense', () => {
    const loginEmail = `adv.login.user.${Date.now()}@passq.vn`;
    const validPassword = 'TargetPassword123!';

    beforeAll(async () => {
      const req = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: loginEmail,
          password: validPassword,
          name: 'Login Verification User',
        },
      });
      const res = await registerPOST(req);
      const json = await res.json();
      if (json.user?.id) createdUserIds.push(json.user.id);
    });

    it('2.1 Đăng nhập thành công với thông tin chính xác (200)', async () => {
      const req = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: loginEmail,
          password: validPassword,
        },
      });

      const res = await loginPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.email).toBe(loginEmail.toLowerCase());
      expect(json.token).toBeDefined();
    });

    it('2.2 Case-Insensitive Login: Đăng nhập thành công khi email viết hoa (200)', async () => {
      const req = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: loginEmail.toUpperCase(),
          password: validPassword,
        },
      });

      const res = await loginPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.email).toBe(loginEmail.toLowerCase());
    });

    it('2.3 Wrong Password Attack: Từ chối mật khẩu sai (401)', async () => {
      const req = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: loginEmail,
          password: 'IncorrectPasswordXYZ!',
        },
      });

      const res = await loginPOST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Email hoặc mật khẩu không chính xác.');
    });

    it('2.4 User Enumeration Resistance: Tài khoản không tồn tại trả về thông báo lỗi giống hệt (401)', async () => {
      const req = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'nonexistent.random.user.999@passq.vn',
          password: 'AnyPassword123!',
        },
      });

      const res = await loginPOST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      // EXACT same error message prevents timing and dictionary enumeration of registered emails
      expect(json.error).toBe('Email hoặc mật khẩu không chính xác.');
    });

    it('2.5 SQL Injection in Login Credentials: Không thể bypass xác thực bằng SQLi (401)', async () => {
      const sqlBypasses = [
        { email: "' OR '1'='1", password: "' OR '1'='1" },
        { email: `admin' --`, password: 'any' },
        { email: loginEmail, password: "' OR '1'='1" },
        { email: loginEmail, password: "'; DROP TABLE \"User\";--" },
      ];

      for (const cred of sqlBypasses) {
        const req = createTestRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: cred,
        });

        const res = await loginPOST(req);
        expect(res.status).toBe(401);
      }

      // Verify User table is intact
      const userCount = await prisma.user.count();
      expect(userCount).toBeGreaterThanOrEqual(1);
    });

    it('2.6 Missing / Empty Credentials: Từ chối nếu thiếu email hoặc password (400)', async () => {
      const invalidBodies = [
        { email: loginEmail },
        { password: validPassword },
        { email: '', password: validPassword },
        { email: loginEmail, password: '' },
        {},
      ];

      for (const body of invalidBodies) {
        const req = createTestRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body,
        });

        const res = await loginPOST(req);
        expect(res.status).toBe(400);
      }
    });
  });

  // =========================================================================
  // 3. SESSION, COOKIE SECURITY & TOKEN TAMPERING
  // =========================================================================
  describe('3. Session & Cookie Security', () => {
    let validAuthCookie = '';
    let validToken = '';
    let registeredUserId = '';

    beforeAll(async () => {
      const email = `adv.session.${Date.now()}@passq.vn`;
      const req = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email,
          password: 'ValidPassword123!',
          name: 'Session Security User',
        },
      });
      const res = await registerPOST(req);
      const json = await res.json();
      registeredUserId = json.user.id;
      createdUserIds.push(registeredUserId);
      validToken = json.token;

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeDefined();
      validAuthCookie = setCookie || '';
    });

    it('3.1 Cookie Attribute Security: Kiểm tra HttpOnly, SameSite=Lax, Path=/', () => {
      const cookieLower = validAuthCookie.toLowerCase();
      expect(cookieLower).toContain('httponly');
      expect(cookieLower).toContain('samesite=lax');
      expect(cookieLower).toContain('path=/');
      expect(cookieLower).toContain('max-age=604800'); // 7 days in seconds
    });

    it('3.2 Credential Leakage Prevention: passwordHash không bao giờ xuất hiện trong API response', async () => {
      // 1. In Register response
      const regReq = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: `adv.leakage.${Date.now()}@passq.vn`,
          password: 'Password123!',
          name: 'Leak Tester',
        },
      });
      const regRes = await registerPOST(regReq);
      const regJson = await regRes.json();
      if (regJson.user?.id) createdUserIds.push(regJson.user.id);
      expect(regJson.user.passwordHash).toBeUndefined();
      expect(regJson.user.password).toBeUndefined();

      // 2. In Login response
      const logReq = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: regJson.user.email,
          password: 'Password123!',
        },
      });
      const logRes = await loginPOST(logReq);
      const logJson = await logRes.json();
      expect(logJson.user.passwordHash).toBeUndefined();
      expect(logJson.user.password).toBeUndefined();

      // 3. In GET /api/auth/me response
      const meReq = createTestRequest('http://localhost:3000/api/auth/me', {
        cookies: { token: logJson.token },
      });
      const meRes = await meGET(meReq);
      const meJson = await meRes.json();
      expect(meRes.status).toBe(200);
      expect(meJson.user).toBeDefined();
      expect(meJson.user.passwordHash).toBeUndefined();
      expect(meJson.user.password).toBeUndefined();
    });

    it('3.3 Cookie Tampering: Token bị sửa đổi chữ ký bị từ chối (401)', async () => {
      // Tamper signature segment of valid JWT
      const parts = validToken.split('.');
      expect(parts.length).toBe(3);
      const tamperedSig = parts[2].substring(0, parts[2].length - 4) + 'XXXX';
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

      const req = createTestRequest('http://localhost:3000/api/auth/me', {
        cookies: { token: tamperedToken },
      });

      const res = await meGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('hết hạn');
    });

    it('3.4 Algorithm "none" Attack: Token unsigned bị từ chối hoàn toàn (401)', async () => {
      // Craft an unverified none-algorithm token
      const headerB64 = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify({ userId: registeredUserId, email: 'hacker@evil.com' })).toString('base64url');
      const noneToken = `${headerB64}.${payloadB64}.`;

      const req = createTestRequest('http://localhost:3000/api/auth/me', {
        cookies: { token: noneToken },
      });

      const res = await meGET(req);
      expect(res.status).toBe(401);
    });

    it('3.5 Expired Token Attack: Token quá hạn bị từ chối (401)', async () => {
      // Create token expired 1 hour ago
      const expiredToken = jwt.sign(
        { userId: registeredUserId, email: 'expired@passq.vn' },
        TEST_SECRET,
        { expiresIn: '-1h' }
      );

      const req = createTestRequest('http://localhost:3000/api/auth/me', {
        cookies: { token: expiredToken },
      });

      const res = await meGET(req);
      expect(res.status).toBe(401);
    });

    it('3.6 Forged Secret Attack: Token ký bằng secret khác bị từ chối (401)', async () => {
      const forgedToken = jwt.sign(
        { userId: registeredUserId, email: 'forged@passq.vn' },
        'rogue-secret-key-that-does-not-match',
        { expiresIn: '7d' }
      );

      const req = createTestRequest('http://localhost:3000/api/auth/me', {
        cookies: { token: forgedToken },
      });

      const res = await meGET(req);
      expect(res.status).toBe(401);
    });

    it('3.7 Non-Existent User in Valid JWT: Từ chối nếu userId không tồn tại trong DB (401)', async () => {
      const ghostToken = signToken({
        userId: 'ghost-user-uuid-does-not-exist-in-db',
        email: 'ghost@passq.vn',
      });

      const req = createTestRequest('http://localhost:3000/api/auth/me', {
        cookies: { token: ghostToken },
      });

      const res = await meGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('không còn tồn tại');
    });

    it('3.8 Logout Lifecycle: Thu hồi cookie với maxAge = 0 (200)', async () => {
      const res = await logoutPOST();
      expect(res.status).toBe(200);
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain('Max-Age=0');
    });
  });

  // =========================================================================
  // 4. TENANT ISOLATION & CROSS-USER DATA LEAKAGE ATTACKS
  // =========================================================================
  describe('4. Multi-Tenant Isolation & Cross-User Attacks', () => {
    let userAId = '';
    let userBId = '';
    let tokenA = '';
    let tokenB = '';

    beforeAll(async () => {
      // Create Tenant User A
      const emailA = `adv.tenant.a.${Date.now()}@passq.vn`;
      const regARes = await registerPOST(
        createTestRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: { email: emailA, password: 'PasswordA123!', name: 'Tenant A' },
        })
      );
      const jsonA = await regARes.json();
      userAId = jsonA.user.id;
      tokenA = jsonA.token;
      createdUserIds.push(userAId);

      // Create Tenant User B
      const emailB = `adv.tenant.b.${Date.now()}@passq.vn`;
      const regBRes = await registerPOST(
        createTestRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: { email: emailB, password: 'PasswordB123!', name: 'Tenant B' },
        })
      );
      const jsonB = await regBRes.json();
      userBId = jsonB.user.id;
      tokenB = jsonB.token;
      createdUserIds.push(userBId);

      // Seed private study progress for User A ONLY
      // Find first available subunit
      const firstSubunit = await prisma.subunit.findFirst();
      expect(firstSubunit).toBeDefined();

      if (firstSubunit) {
        await prisma.userNodeProgress.create({
          data: {
            userId: userAId,
            subunitId: firstSubunit.id,
            attemptsCount: 50,
            accuracyPct: 92.0,
            status: 'mastered',
          },
        });
      }
    });

    it('4.1 withTenant Wrapper Robustness: Bắt buộc userId hợp lệ', async () => {
      // Empty string
      await expect(withTenant('', async (id) => id)).rejects.toThrow('Tenant context invalid');
      // Null
      await expect(withTenant(null as any, async (id) => id)).rejects.toThrow('Tenant context invalid');
      // Undefined
      await expect(withTenant(undefined as any, async (id) => id)).rejects.toThrow('Tenant context invalid');
      // Number
      await expect(withTenant(12345 as any, async (id) => id)).rejects.toThrow('Tenant context invalid');

      // Valid execution
      const scopedResult = await withTenant(userAId, async (id) => `executed-for:${id}`);
      expect(scopedResult).toBe(`executed-for:${userAId}`);
    });

    it('4.2 Cross-Tenant Isolation in Curriculum Subunits: User B không thấy mastery của User A', async () => {
      const firstSubunit = await prisma.subunit.findFirst();
      expect(firstSubunit).toBeDefined();
      if (!firstSubunit) return;

      // 1. User A queries subunits -> sees 92% mastery on subunit
      const reqA = createTestRequest(`http://localhost:3000/api/curriculum/subunits?unitId=${firstSubunit.unitId}`, {
        cookies: { token: tokenA },
      });
      const resA = await subunitsGET(reqA);
      expect(resA.status).toBe(200);
      const dataA = await resA.json();
      const targetSubunitA = dataA.find((s: any) => s.id === firstSubunit.id);
      expect(targetSubunitA).toBeDefined();
      expect(targetSubunitA.masteryPct).toBe(92);

      // 2. User B queries subunits -> MUST see 0% mastery (no data leak)
      const reqB = createTestRequest(`http://localhost:3000/api/curriculum/subunits?unitId=${firstSubunit.unitId}`, {
        cookies: { token: tokenB },
      });
      const resB = await subunitsGET(reqB);
      expect(resB.status).toBe(200);
      const dataB = await resB.json();
      const targetSubunitB = dataB.find((s: any) => s.id === firstSubunit.id);
      expect(targetSubunitB).toBeDefined();
      expect(targetSubunitB.masteryPct).toBe(0);

      // 3. Unauthenticated user queries subunits -> MUST see 0% mastery
      const reqAnon = createTestRequest(`http://localhost:3000/api/curriculum/subunits?unitId=${firstSubunit.unitId}`);
      const resAnon = await subunitsGET(reqAnon);
      expect(resAnon.status).toBe(200);
      const dataAnon = await resAnon.json();
      const targetSubunitAnon = dataAnon.find((s: any) => s.id === firstSubunit.id);
      expect(targetSubunitAnon).toBeDefined();
      expect(targetSubunitAnon.masteryPct).toBe(0);
    });

    it('4.3 Header Impersonation Attack: Gửi token User B nhưng inject x-user-id của User A bị chặn', async () => {
      // User B attempts to access User A's data by spoofing headers
      const req = createTestRequest('http://localhost:3000/api/auth/me', {
        cookies: { token: tokenB },
        headers: {
          'x-user-id': userAId,
          'user-id': userAId,
          'x-forwarded-user': userAId,
        },
      });

      const res = await meGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      // MUST return User B's profile (derived from verified JWT), never User A
      expect(json.user.id).toBe(userBId);
      expect(json.user.id).not.toBe(userAId);
    });
  });

  // =========================================================================
  // 5. CURRICULUM ROUTE FUZZING & SQL INJECTION RESISTANCE
  // =========================================================================
  describe('5. Curriculum Route Fuzzing & SQLi Resistance', () => {
    it('5.1 GET /api/curriculum/sections: Trả về đầy đủ 6 sections chuẩn CMA Part 2, tổng 100%', async () => {
      const res = await sectionsGET();
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(6);

      const sectionCodes = data.map((s: any) => s.code).sort();
      expect(sectionCodes).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);

      const totalWeight = data.reduce((sum: number, s: any) => sum + s.weightPct, 0);
      expect(totalWeight).toBe(100);

      const totalQuestions = data.reduce((sum: number, s: any) => sum + s.questionCount, 0);
      expect(totalQuestions).toBe(7609);
    });

    it('5.2 GET /api/curriculum/units: Fuzzing với mã section không tồn tại trả về [] (200)', async () => {
      const req = createTestRequest('http://localhost:3000/api/curriculum/units?sectionId=NONEXISTENT_XYZ');
      const res = await unitsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('5.3 GET /api/curriculum/units: SQL Injection Fuzzing không gây crash hoặc lộ dữ liệu (200)', async () => {
      const sqliPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE \"Unit\"; --",
        "A' UNION SELECT 1, 2, 3, 4, 5, 6, 7 --",
        "1; WAITFOR DELAY '0:0:5'--",
      ];

      for (const payload of sqliPayloads) {
        const req = createTestRequest(`http://localhost:3000/api/curriculum/units?sectionId=${encodeURIComponent(payload)}`);
        const res = await unitsGET(req);
        // Handled gracefully: returns 200 with empty array, never 500
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
      }

      // Verify Unit table is intact
      const unitCount = await prisma.unit.count();
      expect(unitCount).toBe(15);
    });

    it('5.4 GET /api/curriculum/units: Extreme Length Fuzzing (5000 ký tự) không gây crash', async () => {
      const hugeParam = 'A'.repeat(5000);
      const req = createTestRequest(`http://localhost:3000/api/curriculum/units?sectionId=${hugeParam}`);
      const res = await unitsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('5.5 GET /api/curriculum/subunits: Fuzzing với unitId không tồn tại và SQLi trả về [] (200)', async () => {
      const maliciousUnitIds = [
        'NONEXISTENT_UNIT_ID',
        "' OR 1=1 --",
        '../../../../etc/passwd',
        '<script>alert("unit")</script>',
        '%00%27%22',
      ];

      for (const unitId of maliciousUnitIds) {
        const req = createTestRequest(`http://localhost:3000/api/curriculum/subunits?unitId=${encodeURIComponent(unitId)}`);
        const res = await subunitsGET(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
      }

      // Verify Subunit table is intact
      const subunitCount = await prisma.subunit.count();
      expect(subunitCount).toBe(57);
    });

    it('5.6 GET /api/curriculum/subunits: Lọc theo sectionId hợp lệ trả về đúng danh sách subunits', async () => {
      const req = createTestRequest('http://localhost:3000/api/curriculum/subunits?sectionId=A');
      const res = await subunitsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      for (const item of data) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('unitId');
        expect(item).toHaveProperty('code');
        expect(item).toHaveProperty('questionCount');
        expect(item).toHaveProperty('masteryPct');
      }
    });
  });
});
