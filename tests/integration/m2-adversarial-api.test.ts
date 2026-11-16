import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET as statsGET } from "@/app/api/user/stats/route";
import { PUT as planPUT } from "@/app/api/user/plan/route";
import { createTestRequest } from "../helpers/test-request";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "passq-cma-production-secret-jwt-key-2026";

describe("Milestone 2 API Adversarial Challenge Suite", () => {
  const userA_Id = `adv-user-a-${Date.now()}`;
  const userB_Id = `adv-user-b-${Date.now()}`;
  const userA_Email = `user.a.${Date.now()}@passq.test`;
  const userB_Email = `user.b.${Date.now()}@passq.test`;

  let tokenUserA: string;
  let tokenUserB: string;

  beforeAll(async () => {
    // Seed real User A
    await prisma.user.create({
      data: {
        id: userA_Id,
        email: userA_Email,
        passwordHash: "dummy-hash",
        fullName: "Adv Student A",
        role: "STUDENT",
        weeklyHours: 12,
        targetScore: 410,
        studyMode: "standard",
        targetExamDate: new Date("2026-12-01T00:00:00Z"),
        stats: {
          create: {
            totalAnswered: 80,
            totalCorrect: 60,
            totalTimeSeconds: 7200,
            streakDays: 5,
          },
        },
        streak: {
          create: {
            currentStreak: 5,
            longestStreak: 10,
            freezesLeft: 2,
          },
        },
      },
    });

    // Seed real User B
    await prisma.user.create({
      data: {
        id: userB_Id,
        email: userB_Email,
        passwordHash: "dummy-hash",
        fullName: "Adv Student B",
        role: "STUDENT",
        weeklyHours: 25,
        targetScore: 480,
        studyMode: "fast_track",
        targetExamDate: new Date("2026-11-20T00:00:00Z"),
        stats: {
          create: {
            totalAnswered: 350,
            totalCorrect: 310,
            totalTimeSeconds: 36000,
            streakDays: 15,
          },
        },
        streak: {
          create: {
            currentStreak: 15,
            longestStreak: 20,
            freezesLeft: 0,
          },
        },
      },
    });

    tokenUserA = signToken({ userId: userA_Id, email: userA_Email, role: "STUDENT" });
    tokenUserB = signToken({ userId: userB_Id, email: userB_Email, role: "STUDENT" });
  });

  afterAll(async () => {
    try {
      await prisma.userStudyStats.deleteMany({
        where: { userId: { in: [userA_Id, userB_Id] } },
      });
      await prisma.userStreak.deleteMany({
        where: { userId: { in: [userA_Id, userB_Id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userA_Id, userB_Id] } },
      });
    } catch (e) {
      // Ignore
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. SECURITY & AUTHENTICATION TESTS
  // =========================================================================
  describe("1. Security: Authentication verification", () => {
    it("1.1 GET /api/user/stats - Missing token -> 401", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/stats");
      const res = await statsGET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("1.2 GET /api/user/stats - Invalid signature -> 401", async () => {
      const forgedToken = jwt.sign({ userId: userA_Id, email: userA_Email }, "wrong-secret-key-12345");
      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: `Bearer ${forgedToken}` },
      });
      const res = await statsGET(req);
      expect(res.status).toBe(401);
    });

    it("1.3 GET /api/user/stats - Expired token -> 401", async () => {
      const expiredToken = jwt.sign(
        { userId: userA_Id, email: userA_Email, exp: Math.floor(Date.now() / 1000) - 3600 },
        JWT_SECRET
      );
      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      const res = await statsGET(req);
      expect(res.status).toBe(401);
    });

    it("1.4 PUT /api/user/plan - Missing token -> 401", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        body: { weeklyHours: 15 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(401);
    });

    it("1.5 PUT /api/user/plan - Invalid signature -> 401", async () => {
      const forgedToken = jwt.sign({ userId: userA_Id, email: userA_Email }, "attacker-forged-secret");
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${forgedToken}` },
        body: { weeklyHours: 15 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(401);
    });

    it("1.6 PUT /api/user/plan - Expired token -> 401", async () => {
      const expiredToken = jwt.sign(
        { userId: userA_Id, email: userA_Email, exp: Math.floor(Date.now() / 1000) - 60 },
        JWT_SECRET
      );
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${expiredToken}` },
        body: { weeklyHours: 15 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 2. TENANT ISOLATION TESTS
  // =========================================================================
  describe("2. Tenant Isolation", () => {
    it("2.1 User A token only reads User A stats, cannot leak User B stats", async () => {
      const reqA = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });
      const resA = await statsGET(reqA);
      expect(resA.status).toBe(200);
      const dataA = await resA.json();

      expect(dataA.stats.totalQuestionsAnswered).toBe(80);
      expect(dataA.stats.totalCorrect).toBe(60);
      expect(dataA.stats.currentStreak).toBe(5);
      expect(dataA.stats.targetScore).toBe(410);
      expect(dataA.examPlan.weeklyHours).toBe(12);

      // Verify User B's stats were not returned
      expect(dataA.stats.totalQuestionsAnswered).not.toBe(350);
      expect(dataA.stats.currentStreak).not.toBe(15);
    });

    it("2.2 User A cannot query User B stats by spoofing query param ?userId", async () => {
      const reqSpoof = createTestRequest(`http://localhost:3000/api/user/stats?userId=${userB_Id}`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });
      const resSpoof = await statsGET(reqSpoof);
      expect(resSpoof.status).toBe(200);
      const dataSpoof = await resSpoof.json();

      // Must strictly be User A's stats
      expect(dataSpoof.stats.totalQuestionsAnswered).toBe(80);
      expect(dataSpoof.stats.currentStreak).toBe(5);
      expect(dataSpoof.stats.totalQuestionsAnswered).not.toBe(350);
    });

    it("2.3 User A cannot mutate User B plan by injecting userId in PUT body", async () => {
      const reqAttack = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: {
          userId: userB_Id, // Attacker tries to alter User B
          weeklyHours: 35,
          targetScore: 490,
          studyMode: "fast_track",
        },
      });
      const resAttack = await planPUT(reqAttack);
      expect(resAttack.status).toBe(200);

      // Verify in DB: User B remains untouched!
      const userBInDb = await prisma.user.findUnique({ where: { id: userB_Id } });
      expect(userBInDb?.weeklyHours).toBe(25);
      expect(userBInDb?.targetScore).toBe(480);

      // Verify User A was the one updated
      const userAInDb = await prisma.user.findUnique({ where: { id: userA_Id } });
      expect(userAInDb?.weeklyHours).toBe(35);
      expect(userAInDb?.targetScore).toBe(490);
    });
  });

  // =========================================================================
  // 3. BOUNDARY & MALFORMED INPUTS ON PUT /api/user/plan
  // =========================================================================
  describe("3. Boundary & Malformed Inputs on PUT /api/user/plan", () => {
    it("3.1 Negative weeklyHours (-5) -> must be rejected (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { weeklyHours: -5 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3.2 Zero weeklyHours (0) -> must be rejected (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { weeklyHours: 0 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3.3 Excess weeklyHours (100) -> must be rejected (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { weeklyHours: 100 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3.4 Huge weeklyHours (9999) -> must be rejected (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { weeklyHours: 9999 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3.5 Out-of-range low targetScore (200) -> must be rejected (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { targetScore: 200 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3.6 Out-of-range high targetScore (600) -> must be rejected (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { targetScore: 600 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3.7 Huge out-of-range targetScore (9999) -> must be rejected (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { targetScore: 9999 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3.8 Malformed date string ('not-a-date') -> must be rejected (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { examDate: "not-a-date" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3.9 Malformed / Past date ('1990-01-01') -> must be rejected (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { examDate: "1990-01-01" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3.10 Null examDate (null) -> must be rejected (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { examDate: null },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("3.11 Boolean examDate (true / false) -> must be rejected (400)", async () => {
      const reqTrue = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { examDate: true },
      });
      const resTrue = await planPUT(reqTrue);
      expect(resTrue.status).toBe(400);

      const reqFalse = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: { examDate: false },
      });
      const resFalse = await planPUT(reqFalse);
      expect(resFalse.status).toBe(400);
    });

    it("3.12 SQL injection in studyMode -> safely rejected (400)", async () => {
      const sqliPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE User; --",
        "standard' UNION SELECT * FROM User --",
      ];
      for (const payload of sqliPayloads) {
        const req = createTestRequest("http://localhost:3000/api/user/plan", {
          method: "PUT",
          headers: { Authorization: `Bearer ${tokenUserA}` },
          body: { studyMode: payload },
        });
        const res = await planPUT(req);
        expect(res.status).toBe(400);
      }
    });

    it("3.13 Payload tampering: extra privilege fields are safely ignored / unmutated", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenUserA}` },
        body: {
          role: "ADMIN",
          id: "compromised-id",
          passwordHash: "hacked-hash",
          weeklyHours: 18,
        },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(200);

      const userAInDb = await prisma.user.findUnique({ where: { id: userA_Id } });
      expect(userAInDb?.role).toBe("STUDENT"); // NOT mutated to ADMIN
      expect(userAInDb?.id).toBe(userA_Id); // NOT mutated
      expect(userAInDb?.passwordHash).toBe("dummy-hash"); // NOT mutated
      expect(userAInDb?.weeklyHours).toBe(18); // Legitimate field updated
    });
  });

  // =========================================================================
  // 4. CONCURRENCY & PERFORMANCE BENCHMARK
  // =========================================================================
  describe("4. Concurrency & Performance: 25 concurrent GET /api/user/stats", () => {
    it("4.1 25 concurrent requests execute successfully with zero errors and low latency", async () => {
      const N = 25;
      const startTime = performance.now();

      const requests = Array.from({ length: N }, (_, i) => {
        const req = createTestRequest(`http://localhost:3000/api/user/stats?reqIndex=${i}`, {
          headers: { Authorization: `Bearer ${tokenUserA}` },
        });
        const t0 = performance.now();
        return statsGET(req).then(async (res) => {
          const t1 = performance.now();
          const json = await res.json();
          return {
            status: res.status,
            latencyMs: t1 - t0,
            hasStats: Boolean(json.stats),
          };
        });
      });

      const results = await Promise.all(requests);
      const totalDurationMs = performance.now() - startTime;

      const statuses = results.map((r) => r.status);
      const latencies = results.map((r) => r.latencyMs);
      const allSuccess = statuses.every((s) => s === 200);

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);

      console.log(`[CONCURRENCY BENCHMARK] 25 requests finished in ${totalDurationMs.toFixed(1)}ms`);
      console.log(`Latencies: Min=${minLatency.toFixed(1)}ms, Max=${maxLatency.toFixed(1)}ms, Avg=${avgLatency.toFixed(1)}ms`);

      expect(allSuccess).toBe(true);
      expect(results.every((r) => r.hasStats)).toBe(true);
      expect(avgLatency).toBeLessThan(500); // 500ms max average
    });
  });
});
