import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET as statsGET } from "@/app/api/user/stats/route";
import { PUT as planPUT } from "@/app/api/user/plan/route";
import { createTestRequest } from "../helpers/test-request";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "passq-cma-production-secret-jwt-key-2026";

describe("Challenger 2 - Adversarial Security, Tenant Isolation & Boundary Stress Suite", () => {
  const ts = Date.now();
  const userAlphaId = `adv-alpha-${ts}`;
  const userBetaId = `adv-beta-${ts}`;
  const userAlphaEmail = `alpha.${ts}@passq.test`;
  const userBetaEmail = `beta.${ts}@passq.test`;

  let tokenAlpha: string;
  let tokenBeta: string;

  beforeAll(async () => {
    // 1. Seed User Alpha
    await prisma.user.create({
      data: {
        id: userAlphaId,
        email: userAlphaEmail,
        passwordHash: "alpha-hash-pwd",
        fullName: "User Alpha Adversarial",
        role: "STUDENT",
        weeklyHours: 14,
        targetScore: 420,
        studyMode: "standard",
        targetExamDate: new Date("2026-12-15T00:00:00Z"),
        stats: {
          create: {
            totalAnswered: 120,
            totalCorrect: 95,
            totalTimeSeconds: 10800,
            streakDays: 7,
          },
        },
        streak: {
          create: {
            currentStreak: 7,
            longestStreak: 14,
            freezesLeft: 2,
          },
        },
      },
    });

    // 2. Seed User Beta
    await prisma.user.create({
      data: {
        id: userBetaId,
        email: userBetaEmail,
        passwordHash: "beta-hash-pwd",
        fullName: "User Beta Adversarial",
        role: "STUDENT",
        weeklyHours: 28,
        targetScore: 475,
        studyMode: "fast_track",
        targetExamDate: new Date("2026-11-25T00:00:00Z"),
        stats: {
          create: {
            totalAnswered: 450,
            totalCorrect: 390,
            totalTimeSeconds: 45000,
            streakDays: 22,
          },
        },
        streak: {
          create: {
            currentStreak: 22,
            longestStreak: 30,
            freezesLeft: 0,
          },
        },
      },
    });

    tokenAlpha = signToken({ userId: userAlphaId, email: userAlphaEmail, role: "STUDENT" });
    tokenBeta = signToken({ userId: userBetaId, email: userBetaEmail, role: "STUDENT" });
  });

  afterAll(async () => {
    try {
      await prisma.userStudyStats.deleteMany({
        where: { userId: { in: [userAlphaId, userBetaId] } },
      });
      await prisma.userStreak.deleteMany({
        where: { userId: { in: [userAlphaId, userBetaId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userAlphaId, userBetaId] } },
      });
    } catch (e) {
      // Ignore cleanup error
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. SECURITY & AUTHENTICATION TESTS (Missing, Invalid, Expired, Tampered)
  // =========================================================================
  describe("1. Security: Unauthenticated Calls & Token Tampering (Must return 401)", () => {
    it("1.1 GET /api/user/stats without token returns 401", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/stats");
      const res = await statsGET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("1.2 GET /api/user/stats with invalid signature returns 401", async () => {
      const forgedToken = jwt.sign(
        { userId: userAlphaId, email: userAlphaEmail },
        "forged-attacker-secret-key-xyz"
      );
      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: `Bearer ${forgedToken}` },
      });
      const res = await statsGET(req);
      expect(res.status).toBe(401);
    });

    it("1.3 GET /api/user/stats with expired token returns 401", async () => {
      const expiredToken = jwt.sign(
        {
          userId: userAlphaId,
          email: userAlphaEmail,
          exp: Math.floor(Date.now() / 1000) - 7200, // expired 2 hours ago
        },
        JWT_SECRET
      );
      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      const res = await statsGET(req);
      expect(res.status).toBe(401);
    });

    it("1.4 GET /api/user/stats with 'none' algorithm token returns 401", async () => {
      // Craft an unverified token with alg: none
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({ userId: userAlphaId, email: userAlphaEmail })
      ).toString("base64url");
      const noneToken = `${header}.${payload}.`;

      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: `Bearer ${noneToken}` },
      });
      const res = await statsGET(req);
      expect(res.status).toBe(401);
    });

    it("1.5 GET /api/user/stats with valid token for deleted/non-existent user returns 401", async () => {
      const ghostToken = signToken({
        userId: "ghost-user-non-existent-99999",
        email: "ghost@passq.test",
        role: "STUDENT",
      });
      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: `Bearer ${ghostToken}` },
      });
      const res = await statsGET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Người dùng không tồn tại");
    });

    it("1.6 PUT /api/user/plan without token returns 401", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        body: { weeklyHours: 20 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(401);
    });

    it("1.7 PUT /api/user/plan with invalid signature returns 401", async () => {
      const forgedToken = jwt.sign(
        { userId: userAlphaId, email: userAlphaEmail },
        "fake-secret-999"
      );
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${forgedToken}` },
        body: { weeklyHours: 20 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(401);
    });

    it("1.8 PUT /api/user/plan with expired token returns 401", async () => {
      const expiredToken = jwt.sign(
        {
          userId: userAlphaId,
          email: userAlphaEmail,
          exp: Math.floor(Date.now() / 1000) - 300,
        },
        JWT_SECRET
      );
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${expiredToken}` },
        body: { weeklyHours: 20 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(401);
    });

    it("1.9 PUT /api/user/plan with malformed Authorization header returns 401", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: "Bearer " }, // empty bearer
        body: { weeklyHours: 20 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 2. TENANT ISOLATION TESTS (Cross-User Read and Mutation Infiltration)
  // =========================================================================
  describe("2. Tenant Isolation: User A cannot read or mutate User B", () => {
    it("2.1 User Alpha cannot view User Beta's stats via GET /api/user/stats", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: `Bearer ${tokenAlpha}` },
      });
      const res = await statsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Must be User Alpha's exact data
      expect(data.stats.totalQuestionsAnswered).toBe(120);
      expect(data.stats.totalCorrect).toBe(95);
      expect(data.stats.currentStreak).toBe(7);
      expect(data.stats.targetScore).toBe(420);
      expect(data.examPlan.weeklyHours).toBe(14);
      expect(data.examPlan.studyMode).toBe("standard");

      // Verify User Beta's data is completely absent
      expect(data.stats.totalQuestionsAnswered).not.toBe(450);
      expect(data.stats.totalCorrect).not.toBe(390);
      expect(data.stats.currentStreak).not.toBe(22);
      expect(data.examPlan.weeklyHours).not.toBe(28);
    });

    it("2.2 User Alpha cannot view User Beta stats by spoofing query param ?userId=<BetaId>", async () => {
      const req = createTestRequest(
        `http://localhost:3000/api/user/stats?userId=${encodeURIComponent(userBetaId)}`,
        {
          headers: { Authorization: `Bearer ${tokenAlpha}` },
        }
      );
      const res = await statsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Must strictly ignore query parameter and use verified JWT identity
      expect(data.stats.totalQuestionsAnswered).toBe(120);
      expect(data.stats.totalQuestionsAnswered).not.toBe(450);
    });

    it("2.3 User Alpha cannot mutate User Beta plan by injecting userId/id in PUT /api/user/plan", async () => {
      const attackPayload = {
        userId: userBetaId, // Trying to tamper with Beta
        id: userBetaId,
        weeklyHours: 45,
        targetScore: 495,
        studyMode: "fast_track",
      };

      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: attackPayload,
      });

      const res = await planPUT(req);
      expect(res.status).toBe(200);

      // Verify User Beta in DB is 100% UNTOUCHED
      const userBetaDb = await prisma.user.findUnique({ where: { id: userBetaId } });
      expect(userBetaDb).toBeDefined();
      expect(userBetaDb?.weeklyHours).toBe(28); // Original value preserved
      expect(userBetaDb?.targetScore).toBe(475); // Original value preserved

      // Verify User Alpha was the only user affected
      const userAlphaDb = await prisma.user.findUnique({ where: { id: userAlphaId } });
      expect(userAlphaDb?.weeklyHours).toBe(45);
      expect(userAlphaDb?.targetScore).toBe(495);
    });

    it("2.4 User Beta's stats remain unaffected after User Alpha's mutations", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: `Bearer ${tokenBeta}` },
      });
      const res = await statsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.stats.totalQuestionsAnswered).toBe(450);
      expect(data.stats.currentStreak).toBe(22);
      expect(data.examPlan.weeklyHours).toBe(28);
      expect(data.examPlan.targetScore).toBe(475);
    });
  });

  // =========================================================================
  // 3. BOUNDARY & MALFORMED INPUTS ON PUT /api/user/plan
  // =========================================================================
  describe("3. Boundary & Malformed Inputs on PUT /api/user/plan", () => {
    // 3a. weeklyHours boundary tests
    it("3a.1 Negative weeklyHours (-5) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { weeklyHours: -5 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Số giờ học");
    });

    it("3a.2 Zero weeklyHours (0) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { weeklyHours: 0 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Số giờ học");
    });

    it("3a.3 Fraction less than 1 weeklyHours (0.5) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { weeklyHours: 0.5 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3a.4 Above maximum weeklyHours (61) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { weeklyHours: 61 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3a.5 Excess weeklyHours (100) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { weeklyHours: 100 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3a.6 Massive weeklyHours (9999) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { weeklyHours: 9999 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3a.7 Non-numeric weeklyHours string ('twenty') -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { weeklyHours: "twenty" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3a.8 Valid edge minimum weeklyHours (1) -> 200", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { weeklyHours: 1 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.plan.weeklyHours).toBe(1);
    });

    it("3a.9 Valid edge maximum weeklyHours (60) -> 200", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { weeklyHours: 60 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.plan.weeklyHours).toBe(60);
    });

    // 3b. targetScore boundary tests (Valid CMA Part 2 range: 360 - 500)
    it("3b.1 Low out-of-range targetScore (200) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { targetScore: 200 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("360");
    });

    it("3b.2 Below minimum targetScore (359) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { targetScore: 359 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3b.3 Above maximum targetScore (501) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { targetScore: 501 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3b.4 High out-of-range targetScore (600) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { targetScore: 600 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3b.5 Massive out-of-range targetScore (9999) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { targetScore: 9999 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3b.6 Valid edge minimum targetScore (360) -> 200", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { targetScore: 360 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.plan.targetScore).toBe(360);
    });

    it("3b.7 Valid edge maximum targetScore (500) -> 200", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { targetScore: 500 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.plan.targetScore).toBe(500);
    });

    // 3c. Malformed date tests
    it("3c.1 Malformed date string ('not-a-date') -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { examDate: "not-a-date" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Ngày thi");
    });

    it("3c.2 Past date ('1990-01-01') -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { examDate: "1990-01-01" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("quá khứ");
    });

    it("3c.3 Null examDate (null) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { examDate: null },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3c.4 Boolean examDate (true / false) -> 400", async () => {
      const reqTrue = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { examDate: true },
      });
      const resTrue = await planPUT(reqTrue);
      expect(resTrue.status).toBe(400);

      const reqFalse = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { examDate: false },
      });
      const resFalse = await planPUT(reqFalse);
      expect(resFalse.status).toBe(400);
    });

    it("3c.5 Numeric examDate (timestamp number) -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { examDate: 1775000000000 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3c.6 Empty string examDate ('') -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { examDate: "" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3c.7 Whitespace examDate ('   ') -> 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { examDate: "   " },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3c.8 Valid future examDate ('2027-06-30') -> 200", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { examDate: "2027-06-30" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(new Date(data.plan.targetExamDate).getFullYear()).toBe(2027);
    });

    // 3d. SQL injection and payload tampering in studyMode / extra fields
    it("3d.1 SQL injection in studyMode is rejected with 400", async () => {
      const sqliAttacks = [
        "' OR '1'='1",
        "'; DROP TABLE \"User\"; --",
        "standard' UNION SELECT * FROM \"User\" --",
        "fast_track' OR 1=1; --",
      ];

      for (const payload of sqliAttacks) {
        const req = createTestRequest("http://localhost:3000/api/user/plan", {
          method: "PUT",
          headers: { Authorization: `Bearer ${tokenAlpha}` },
          body: { studyMode: payload },
        });
        const res = await planPUT(req);
        expect(res.status).toBe(400);
      }
    });

    it("3d.2 XSS script payload in studyMode is rejected with 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { studyMode: "<script>alert('xss')</script>" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3d.3 Arbitrary unwhitelisted studyMode is rejected with 400", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { studyMode: "super-learner-mode" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3d.4 Valid studyMode ('standard', 'fast_track', 'fast-track') -> 200", async () => {
      // standard
      const reqStd = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { studyMode: "standard" },
      });
      const resStd = await planPUT(reqStd);
      expect(resStd.status).toBe(200);
      const dataStd = await resStd.json();
      expect(dataStd.plan.studyMode).toBe("standard");

      // fast-track
      const reqFt = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: { studyMode: "fast-track" },
      });
      const resFt = await planPUT(reqFt);
      expect(resFt.status).toBe(200);
      const dataFt = await resFt.json();
      expect(dataFt.plan.studyMode).toBe("fast_track");
    });

    it("3d.5 Privilege escalation tampering: non-whitelisted fields (role, passwordHash) are ignored", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenAlpha}` },
        body: {
          role: "ADMIN",
          passwordHash: "malicious-hacked-hash",
          email: "hacked@passq.test",
          id: "fake-id-000",
          weeklyHours: 16,
        },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(200);

      // Verify in database: protected fields were NOT modified
      const userAlphaInDb = await prisma.user.findUnique({ where: { id: userAlphaId } });
      expect(userAlphaInDb?.role).toBe("STUDENT");
      expect(userAlphaInDb?.passwordHash).toBe("alpha-hash-pwd");
      expect(userAlphaInDb?.email).toBe(userAlphaEmail);
      expect(userAlphaInDb?.id).toBe(userAlphaId);
      expect(userAlphaInDb?.weeklyHours).toBe(16); // Only whitelisted field updated
    });
  });

  // =========================================================================
  // 4. CONCURRENCY & PERFORMANCE BENCHMARK (25 concurrent GET /api/user/stats)
  // =========================================================================
  describe("4. Concurrency & Performance: 25 concurrent GET /api/user/stats", () => {
    it("4.1 Dispatches 25 simultaneous queries to GET /api/user/stats with zero DB locks or drops", async () => {
      const CONCURRENT_COUNT = 25;
      const wallClockStart = performance.now();

      const promises = Array.from({ length: CONCURRENT_COUNT }, async (_, idx) => {
        const req = createTestRequest(`http://localhost:3000/api/user/stats?concurrencyId=${idx}`, {
          headers: { Authorization: `Bearer ${tokenAlpha}` },
        });
        const reqStart = performance.now();
        const res = await statsGET(req);
        const reqEnd = performance.now();
        const json = await res.json();

        return {
          idx,
          status: res.status,
          latencyMs: reqEnd - reqStart,
          hasValidPayload: Boolean(json.stats && json.examPlan && json.chartData),
        };
      });

      const results = await Promise.all(promises);
      const wallClockEnd = performance.now();
      const totalElapsedMs = wallClockEnd - wallClockStart;

      const latencies = results.map((r) => r.latencyMs);
      const minLatency = Math.min(...latencies);
      const maxLatency = Math.max(...latencies);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      console.log(`\n======================================================`);
      console.log(`[CONCURRENCY BENCHMARK RESULTS]`);
      console.log(`Total concurrent queries: ${CONCURRENT_COUNT}`);
      console.log(`Total wall-clock duration: ${totalElapsedMs.toFixed(2)} ms`);
      console.log(`Average request latency:  ${avgLatency.toFixed(2)} ms`);
      console.log(`Min request latency:      ${minLatency.toFixed(2)} ms`);
      console.log(`Max request latency:      ${maxLatency.toFixed(2)} ms`);
      console.log(`======================================================\n`);

      // All 25 must return 200 OK
      expect(results.every((r) => r.status === 200)).toBe(true);

      // All 25 must contain complete, uncorrupted response data
      expect(results.every((r) => r.hasValidPayload)).toBe(true);

      // No query should exceed 1000ms, average should be under 300ms
      expect(avgLatency).toBeLessThan(300);
      expect(maxLatency).toBeLessThan(1000);
    });
  });
});
