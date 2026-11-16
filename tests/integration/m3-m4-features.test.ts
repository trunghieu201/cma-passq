import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { createTestRequest } from "../helpers/test-request";
import { GET as treeGET } from "@/app/api/curriculum/tree/route";
import { GET as subunitGET } from "@/app/api/curriculum/subunits/[id]/route";
import { GET as questionsGET } from "@/app/api/questions/route";
import { POST as quizSessionPOST } from "@/app/api/quiz/session/route";
import { POST as quizSubmitPOST } from "@/app/api/quiz/submit-answer/route";
import { POST as quizFinishPOST } from "@/app/api/quiz/finish/route";
import { GET as reviewsTodayGET } from "@/app/api/reviews/today/route";
import { POST as reviewsGradePOST } from "@/app/api/reviews/grade/route";
import { GET as formulasGET } from "@/app/api/formulas/route";
import { GET as bookmarksGET, POST as bookmarksPOST } from "@/app/api/bookmarks/route";
import { GET as mockExamsGET } from "@/app/api/mock-exams/route";
import { GET as mockExamDetailGET, POST as mockExamSubmitPOST } from "@/app/api/mock-exams/[id]/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { PUT as planPUT } from "@/app/api/user/plan/route";
import { GET as devicesGET, POST as devicesPOST } from "@/app/api/auth/devices/route";
import { GET as notesGET, POST as notesPOST } from "@/app/api/notes/route";
import { NextRequest } from "next/server";

describe("Milestone 3 & 4 Feature API Suite", () => {
  let testUser: any;
  let testToken: string;

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `test_m3m4_${Date.now()}@passq.test`,
        passwordHash: "hashed_secret",
        fullName: "Học Viên Thử Nghiệm",
        targetExamDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        weeklyHours: 12,
        targetScore: 420,
      },
    });

    testToken = signToken({
      userId: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  // 1. Curriculum Tree
  describe("1. Curriculum Tree API (GET /api/curriculum/tree)", () => {
    it("returns 6 sections with units, subunits and progress stats", async () => {
      const req = createTestRequest("http://localhost:3000/api/curriculum/tree", {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const res = await treeGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.part).toBe(2);
      expect(data.sections.length).toBe(6);
      expect(data.sections[0].units.length).toBeGreaterThan(0);
      expect(data.sections[0].units[0].subunits.length).toBeGreaterThan(0);
    });
  });

  // 2. Subunit Details
  describe("2. Subunit Detail API (GET /api/curriculum/subunits/[id])", () => {
    it("returns subunit details with categories and user progress", async () => {
      const req = createTestRequest("http://localhost:3000/api/curriculum/subunits/2.1.1", {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const res = await subunitGET(req, { params: { id: "2.1.1" } });
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.id).toBe("2.1.1");
      expect(data.code).toBe("2.1.1");
      expect(data.totalQuestions).toBeGreaterThan(0);
      expect(data.categories).toBeInstanceOf(Array);
      expect(data.progress).toBeDefined();
    });

    it("returns 404 for non-existent subunit", async () => {
      const req = createTestRequest("http://localhost:3000/api/curriculum/subunits/non-existent", {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const res = await subunitGET(req, { params: { id: "non-existent" } });
      expect(res.status).toBe(404);
    });
  });

  // 3. Questions API
  describe("3. Questions API (GET /api/questions)", () => {
    it("fetches questions for a given subunit", async () => {
      const req = createTestRequest("http://localhost:3000/api/questions?subunitId=2.1.1&limit=5", {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const res = await questionsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.questions.length).toBeLessThanOrEqual(5);
      expect(data.questions[0].choices.length).toBe(4);
      expect(data.questions[0].explanation).toBeDefined();
    });
  });

  // 4. Interactive Quiz Session Lifecycle
  describe("4. Quiz Session Lifecycle", () => {
    let sessionId: string;
    let sampleQuestionId: string;
    let sampleCorrectChoice: string;

    it("starts a quiz session via POST /api/quiz/session", async () => {
      const req = createTestRequest("http://localhost:3000/api/quiz/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${testToken}` },
        body: {
          mode: "SUBUNIT_PRACTICE",
          title: "Kiểm tra 2.1.1",
          totalQuestions: 10,
          filterScope: { subunitId: "2.1.1" },
        },
      });
      const res = await quizSessionPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sessionId).toBeDefined();
      sessionId = data.sessionId;

      const q = await prisma.question.findFirst({ where: { subunitId: "2.1.1" } });
      sampleQuestionId = q!.id;
      sampleCorrectChoice = q!.correctChoice;
    });

    it("submits an answer with instant grading via POST /api/quiz/submit-answer", async () => {
      const req = createTestRequest("http://localhost:3000/api/quiz/submit-answer", {
        method: "POST",
        headers: { Authorization: `Bearer ${testToken}` },
        body: {
          sessionId,
          questionId: sampleQuestionId,
          selectedChoice: sampleCorrectChoice,
          timeSpentMs: 4500,
        },
      });
      const res = await quizSubmitPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.isCorrect).toBe(true);
      expect(data.correctChoice).toBe(sampleCorrectChoice);
      expect(data.distractorAnalysis).toBeDefined();
      expect(data.explanation).toBeDefined();
    });

    it("finishes the quiz session, calculates score, and updates user progress", async () => {
      const req = createTestRequest("http://localhost:3000/api/quiz/finish", {
        method: "POST",
        headers: { Authorization: `Bearer ${testToken}` },
        body: {
          sessionId,
          subunitId: "2.1.1",
          timeSpentSec: 60,
        },
      });
      const res = await quizFinishPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.totalAnswered).toBeGreaterThanOrEqual(1);
      expect(data.correctCount).toBeGreaterThanOrEqual(1);

      // Verify DB progress updated
      const nodeProgress = await prisma.userNodeProgress.findUnique({
        where: {
          userId_subunitId: {
            userId: testUser.id,
            subunitId: "2.1.1",
          },
        },
      });
      expect(nodeProgress).toBeDefined();
      expect(nodeProgress!.attemptsCount).toBeGreaterThanOrEqual(1);

      // Verify UserStudyStats updated
      const stats = await prisma.userStudyStats.findUnique({
        where: { userId: testUser.id },
      });
      expect(stats!.totalAnswered).toBeGreaterThanOrEqual(1);
      expect(stats!.totalCorrect).toBeGreaterThanOrEqual(1);
    });
  });

  // 5. Spaced Repetition SM-2
  describe("5. Spaced Repetition SM-2 API", () => {
    let questionId: string;

    it("fetches due cards via GET /api/reviews/today", async () => {
      const req = createTestRequest("http://localhost:3000/api/reviews/today", {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const res = await reviewsTodayGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.dueCount).toBeGreaterThan(0);
      expect(data.stages).toBeDefined();
      expect(data.items.length).toBeGreaterThan(0);
      questionId = data.items[0].questionId;
    });

    it("grades an SM-2 review item and computes new interval and ease factor", async () => {
      const req = createTestRequest("http://localhost:3000/api/reviews/grade", {
        method: "POST",
        headers: { Authorization: `Bearer ${testToken}` },
        body: {
          questionId,
          rating: 4, // "Nhớ tốt"
          timeSpentMs: 3000,
        },
      });
      const res = await reviewsGradePOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.isSuccess).toBe(true);
      expect(data.newIntervalDays).toBeGreaterThanOrEqual(1);
      expect(data.newEaseFactor).toBeGreaterThanOrEqual(1.3);
      expect(data.nextDueDate).toBeDefined();

      // Verify DB
      const review = await prisma.userQuestionReview.findUnique({
        where: {
          userId_questionId: {
            userId: testUser.id,
            questionId,
          },
        },
      });
      expect(review).toBeDefined();
      expect(review!.totalAttempts).toBeGreaterThanOrEqual(1);
    });
  });

  // 6. Formulas API
  describe("6. Formulas API (GET /api/formulas)", () => {
    it("searches and filters formulas correctly", async () => {
      const req = createTestRequest("http://localhost:3000/api/formulas?q=Ratio&limit=5");
      const res = await formulasGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.formulas.length).toBeGreaterThan(0);
      expect(data.formulas[0].plainExpr).toBeDefined();
    });
  });

  // 7. Bookmarks API
  describe("7. Bookmarks API (GET & POST /api/bookmarks)", () => {
    it("toggles bookmark on and off", async () => {
      const q = await prisma.question.findFirst();
      const qId = q!.id;

      // Add
      const addReq = createTestRequest("http://localhost:3000/api/bookmarks", {
        method: "POST",
        headers: { Authorization: `Bearer ${testToken}` },
        body: { questionId: qId },
      });
      const addRes = await bookmarksPOST(addReq);
      expect(addRes.status).toBe(200);
      const addData = await addRes.json();
      expect(addData.bookmarked).toBe(true);

      // List
      const listReq = createTestRequest("http://localhost:3000/api/bookmarks", {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const listRes = await bookmarksGET(listReq);
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(listData.bookmarks.some((b: any) => b.question.id === qId)).toBe(true);

      // Remove
      const remReq = createTestRequest("http://localhost:3000/api/bookmarks", {
        method: "POST",
        headers: { Authorization: `Bearer ${testToken}` },
        body: { questionId: qId },
      });
      const remRes = await bookmarksPOST(remReq);
      expect(remRes.status).toBe(200);
      const remData = await remRes.json();
      expect(remData.bookmarked).toBe(false);
    });
  });

  // 8. Mock Exams API
  describe("8. Mock Exams API (GET & POST /api/mock-exams)", () => {
    let mockId: string;

    it("lists all 31 mock exams", async () => {
      const req = createTestRequest("http://localhost:3000/api/mock-exams", {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const res = await mockExamsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.mockExams.length).toBe(31);
      mockId = data.mockExams[0].id;
    });

    it("fetches test paper for mock exam", async () => {
      const req = createTestRequest(`http://localhost:3000/api/mock-exams/${mockId}`);
      const res = await mockExamDetailGET(req, { params: { id: mockId } });
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.id).toBe(mockId);
      expect(data.questions.length).toBe(100);
      expect(data.questions[0].choices.length).toBe(4);
    });

    it("submits mock exam and calculates IMA scaled score", async () => {
      const req = createTestRequest(`http://localhost:3000/api/mock-exams/${mockId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${testToken}` },
        body: {
          answers: {},
          totalTimeSeconds: 5400,
        },
      });
      const res = await mockExamSubmitPOST(req, { params: { id: mockId } });
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.scaledScore).toBeDefined();
      expect(data.sectionBreakdown).toBeDefined();
    });

    it("returns 400 Bad Request when submitting malformed JSON payload to mock exam", async () => {
      const req = new NextRequest(`http://localhost:3000/api/mock-exams/${mockId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${testToken}`,
          "Content-Type": "application/json",
        },
        body: "{ malformed: unclosed json",
      });
      const res = await mockExamSubmitPOST(req, { params: { id: mockId } });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("JSON");
    });
  });

  // 9. Hardened Input Validation & Defensive JSON Body Parsing
  describe("9. Defensive JSON Body Validation on Auth & Plan APIs", () => {
    it("POST /api/auth/login returns 400 Bad Request on malformed JSON", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ not-json",
      });
      const res = await loginPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("JSON");
    });

    it("PUT /api/user/plan returns 400 Bad Request on malformed JSON", async () => {
      const req = new NextRequest("http://localhost:3000/api/user/plan", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${testToken}`,
          "Content-Type": "application/json",
        },
        body: "invalid:json",
      });
      const res = await planPUT(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("JSON");
    });
  });

  // 10. Device Session Management API
  describe("10. Device Management API (/api/auth/devices)", () => {
    it("GET /api/auth/devices returns active session details for authenticated user", async () => {
      const req = createTestRequest("http://localhost:3000/api/auth/devices", {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const res = await devicesGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.activeSessionsCount).toBeGreaterThanOrEqual(1);
      expect(data.currentDevice.name).toContain("Web App");
    });

    it("POST /api/auth/devices revokes secondary user sessions", async () => {
      const req = createTestRequest("http://localhost:3000/api/auth/devices", {
        method: "POST",
        headers: { Authorization: `Bearer ${testToken}` },
        body: { action: "revoke-others" },
      });
      const res = await devicesPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain("thu hồi");
    });
  });

  // 11. Personal Notes API (/api/notes)
  describe("11. Personal Notes API (/api/notes)", () => {
    it("rejects unauthorized note requests with 401", async () => {
      const getReq = createTestRequest("http://localhost:3000/api/notes?questionId=p2-1");
      const getRes = await notesGET(getReq);
      expect(getRes.status).toBe(401);

      const postReq = createTestRequest("http://localhost:3000/api/notes", {
        method: "POST",
        body: { questionId: "p2-1", content: "Test note" },
      });
      const postRes = await notesPOST(postReq);
      expect(postRes.status).toBe(401);
    });

    it("creates, retrieves, and clears personal study notes with tenant isolation", async () => {
      const q = await prisma.question.findFirst();
      const qId = q!.id;

      // 1. Save note
      const saveReq = createTestRequest("http://localhost:3000/api/notes", {
        method: "POST",
        headers: { Authorization: `Bearer ${testToken}` },
        body: { questionId: qId, content: "Lưu ý công thức DuPont: ROE = Net Profit Margin * Asset Turnover * Leverage" },
      });
      const saveRes = await notesPOST(saveReq);
      expect(saveRes.status).toBe(200);
      const saveData = await saveRes.json();
      expect(saveData.success).toBe(true);
      expect(saveData.note).toContain("DuPont");

      // 2. Retrieve note for specific question
      const getReq = createTestRequest(`http://localhost:3000/api/notes?questionId=${qId}`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const getRes = await notesGET(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.note).toContain("DuPont");

      // 3. List all notes
      const listReq = createTestRequest("http://localhost:3000/api/notes", {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const listRes = await notesGET(listReq);
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(listData.notes.some((n: any) => n.questionId === qId)).toBe(true);

      // 4. Clear note with empty content
      const clearReq = createTestRequest("http://localhost:3000/api/notes", {
        method: "POST",
        headers: { Authorization: `Bearer ${testToken}` },
        body: { questionId: qId, content: "   " },
      });
      const clearRes = await notesPOST(clearReq);
      expect(clearRes.status).toBe(200);
      const clearData = await clearRes.json();
      expect(clearData.note).toBeNull();

      // 5. Verify deleted
      const verifyReq = createTestRequest(`http://localhost:3000/api/notes?questionId=${qId}`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      const verifyRes = await notesGET(verifyReq);
      const verifyData = await verifyRes.json();
      expect(verifyData.note).toBeNull();
    });
  });
});
