import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as statsGET } from "@/app/api/user/stats/route";
import { PUT as planPUT } from "@/app/api/user/plan/route";
import { createTestRequest } from "../helpers/test-request";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userNodeProgress: {
      findFirst: vi.fn(),
    },
    subunit: {
      findFirst: vi.fn(),
    },
    userQuestionReview: {
      count: vi.fn(),
    },
    userDailyActivity: {
      findMany: vi.fn(),
    },
  },
}));

describe("Dashboard Stats & Plan APIs", () => {
  const mockUserId = "test-user-m2-uuid";
  const validToken = signToken({
    userId: mockUserId,
    email: "student@passq.vn",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/user/stats", () => {
    it("trả về 401 khi không có auth token", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/stats");
      const res = await statsGET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Chưa đăng nhập");
    });

    it("trả về 401 khi token không hợp lệ", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: "Bearer invalid.jwt.token" },
      });
      const res = await statsGET(req);
      expect(res.status).toBe(401);
    });

    it("trả về đầy đủ 5 card data và chart series khi authenticated", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        email: "student@passq.vn",
        fullName: "Nguyen Van A",
        targetExamDate: new Date("2026-12-15T00:00:00Z"),
        weeklyHours: 10,
        dailyGoalCount: 20,
        targetScore: 400,
        studyMode: "standard",
        stats: {
          totalAnswered: 142,
          totalCorrect: 111,
          totalTimeSeconds: 30600,
          streakDays: 4,
        },
        streak: {
          currentStreak: 4,
          longestStreak: 7,
          freezesLeft: 1,
        },
      });

      (prisma.userNodeProgress.findFirst as any).mockResolvedValue({
        subunit: {
          id: "2.1.1",
          code: "2.1.1",
          title: "Common-Size Financial Statements",
          unit: {
            unitNumber: 1,
            title: "Financial Statements Analysis",
            section: { code: "A", title: "Financial Statement Analysis" },
          },
        },
        accuracyPct: 65,
      });

      (prisma.userQuestionReview.count as any).mockResolvedValue(14);
      (prisma.userDailyActivity.findMany as any).mockResolvedValue([]);

      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        headers: { Authorization: `Bearer ${validToken}` },
      });

      const res = await statsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Stats assertion
      expect(data).toHaveProperty("stats");
      expect(data.stats.totalQuestionsAnswered).toBe(142);
      expect(data.stats.totalCorrect).toBe(111);
      expect(data.stats.correctRate).toBe(78);
      expect(data.stats.currentStreak).toBe(4);
      expect(data.stats.targetScore).toBe(400);

      // Exam Plan assertion
      expect(data).toHaveProperty("examPlan");
      expect(data.examPlan).toHaveProperty("targetExamDate");
      expect(data.examPlan).toHaveProperty("examDateFormatted");
      expect(data.examPlan.weeklyHours).toBe(10);
      expect(data.examPlan.studyMode).toBe("standard");
      expect(data.examPlan.daysRemaining).toBeGreaterThanOrEqual(0);

      // Active Node assertion
      expect(data).toHaveProperty("activeNode");
      expect(data.activeNode.code).toBe("2.1.1");
      expect(data.activeNode.completionPct).toBe(65);
      expect(data.activeNode.continueUrl).toContain("/lo-trinh?activeNode=");

      // Daily Todos assertion
      expect(data).toHaveProperty("dailyTodos");
      expect(data.dailyTodos.dueFlashcardsCount).toBe(14);
      expect(data.dailyTodos.practiceQuestionsGoal).toBe(20);

      // Chart Data assertion
      expect(data).toHaveProperty("chartData");
      expect(data.chartData.length).toBe(6);
      expect(data.chartData[0]).toHaveProperty("plannedCumulative");
      expect(data.chartData[0]).toHaveProperty("week");
    });

    it("hỗ trợ xác thực qua auth cookie", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: mockUserId,
        email: "student@passq.vn",
        fullName: "Nguyen Van A",
        targetExamDate: new Date("2026-12-15T00:00:00Z"),
        weeklyHours: 10,
        dailyGoalCount: 20,
        targetScore: 400,
        stats: null,
        streak: null,
      });

      (prisma.userNodeProgress.findFirst as any).mockResolvedValue(null);
      (prisma.subunit.findFirst as any).mockResolvedValue({
        id: "2.1.1",
        code: "2.1.1",
        title: "Common-Size Financial Statements",
        unit: {
          unitNumber: 1,
          title: "Financial Statements Analysis",
          section: { code: "A", title: "Financial Statement Analysis" },
        },
      });

      (prisma.userQuestionReview.count as any).mockResolvedValue(0);
      (prisma.userDailyActivity.findMany as any).mockResolvedValue([]);

      const req = createTestRequest("http://localhost:3000/api/user/stats", {
        cookies: { token: validToken },
      });

      const res = await statsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.stats.totalQuestionsAnswered).toBe(0);
      expect(data.activeNode.code).toBe("2.1.1");
    });
  });

  describe("PUT /api/user/plan", () => {
    it("trả về 401 khi không có auth token", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        body: { weeklyHours: 15 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(401);
    });

    it("từ chối ngày thi không hợp lệ (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${validToken}` },
        body: { examDate: "not-a-valid-date" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Ngày thi không đúng định dạng");
    });

    it("từ chối weeklyHours vượt quá giới hạn (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${validToken}` },
        body: { weeklyHours: 100 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("1 đến 60");
    });

    it("từ chối targetScore ngoài khoảng 360-500 (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${validToken}` },
        body: { targetScore: 300 },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("360 đến 500");
    });

    it("từ chối studyMode không hợp lệ (400)", async () => {
      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${validToken}` },
        body: { studyMode: "unsupported_mode" },
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
    });

    it("cập nhật thành công plan khi dữ liệu hợp lệ", async () => {
      (prisma.user.update as any).mockResolvedValue({
        id: mockUserId,
        targetExamDate: new Date("2026-12-20T00:00:00Z"),
        weeklyHours: 15,
        targetScore: 420,
        studyMode: "fast_track",
      });

      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${validToken}` },
        body: {
          examDate: "2026-12-20T00:00:00.000Z",
          weeklyHours: 15,
          targetScore: 420,
          studyMode: "fast_track",
        },
      });

      const res = await planPUT(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.plan.weeklyHours).toBe(15);
      expect(data.plan.targetScore).toBe(420);
      expect(data.plan.studyMode).toBe("fast_track");
    });

    it("chấp nhận mode alias (fast-track) và chuẩn hóa về fast_track", async () => {
      (prisma.user.update as any).mockResolvedValue({
        id: mockUserId,
        targetExamDate: new Date("2026-12-20T00:00:00Z"),
        weeklyHours: 20,
        targetScore: 450,
        studyMode: "fast_track",
      });

      const req = createTestRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${validToken}` },
        body: {
          weeklyHours: 20,
          mode: "fast-track",
        },
      });

      const res = await planPUT(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.plan.studyMode).toBe("fast_track");
    });
  });
});
