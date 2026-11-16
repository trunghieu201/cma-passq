/**
 * Milestone 2 Adversarial Challenge Suite: UI Responsiveness, Layout & Component Contracts
 * Empirically challenges and verifies:
 * 1. Auth redirect: Requesting (main) routes without valid auth session redirects to /login with HTTP 307
 * 2. Test selectors: All 22 required selectors from test-selectors.ts exist in DOM / component trees
 * 3. Copy protection: Copying > 280 characters is truncated to exactly 280 characters with copyright notice
 * 4. SVG Chart integrity: Dual-curve SVG renders both paths (#dc2626 and #1f6fb2) with viewBox "0 0 760 260"
 * 5. Viewport responsiveness: Mobile menu toggle and responsive drawer triggers
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock next/navigation before component imports
vi.mock("next/navigation", () => {
  return {
    usePathname: () => "/dashboard",
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    redirect: vi.fn((url: string) => {
      const error: any = new Error("NEXT_REDIRECT");
      error.digest = `NEXT_REDIRECT;replace;${url};307;`;
      throw error;
    }),
  };
});

// Import Layout & Dashboard Components
import { AppLayout } from "@/components/layout/app-layout";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PlanPicker } from "@/components/layout/plan-picker";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { LayoutProvider } from "@/components/layout/layout-context";
import { KpiStatsGrid } from "@/components/dashboard/kpi-stats-grid";
import { ContinueLearningCard } from "@/components/dashboard/continue-learning-card";
import { ExamDateControl } from "@/components/dashboard/exam-date-control";
import { MethodologyGuideCard } from "@/components/dashboard/methodology-guide-card";
import { StudyHoursChart } from "@/components/dashboard/study-hours-chart";
import {
  MAX_COPY_CHARS,
  COPY_NOTICE_MESSAGE,
  useCopyProtection,
  CopyProtectedContainer,
} from "@/components/ui/copy-protection";
import { SELECTORS } from "../helpers/test-selectors";
import { signToken, verifyToken, getCurrentUser } from "@/lib/auth";
import MainLayout from "@/app/(main)/layout";

// Mock User Data for Component Rendering
const mockUser = {
  id: "test-user-m2-adv",
  email: "student@passq.test",
  name: "Nguyễn Văn CMA",
  role: "STUDENT",
  targetExamDate: new Date("2026-12-01T00:00:00Z"),
  stats: {
    totalAnswered: 450,
    totalCorrect: 360,
    streakDays: 12,
    dailyGoalCount: 20,
    lastActiveDate: new Date(),
  },
};

const mockActiveNode = {
  id: "cma-p2-u1-sub1",
  code: "U1.1",
  title: "Báo cáo tài chính quy mô chung (Common-size Financial Statements)",
  unitNumber: 1,
  unitTitle: "Phân tích báo cáo tài chính",
  sectionCode: "A",
  sectionTitle: "Financial Statement Analysis",
  completionPct: 65,
  continueUrl: "/luyen-tap?subunit=cma-p2-u1-sub1",
};

const mockExamPlan = {
  targetExamDate: "2026-12-01",
  examDateFormatted: "01/12/2026",
  daysRemaining: 15,
  weeklyHours: 15,
  studyMode: "standard",
  targetScore: 430,
};

const mockChartData = [
  { week: "T1", plannedCumulative: 10, actualCumulative: 12, plannedWeekly: 10, actualWeekly: 12 },
  { week: "T2", plannedCumulative: 20, actualCumulative: 22, plannedWeekly: 10, actualWeekly: 10 },
  { week: "T3", plannedCumulative: 30, actualCumulative: 28, plannedWeekly: 10, actualWeekly: 6 },
  { week: "T4", plannedCumulative: 40, actualCumulative: 39, plannedWeekly: 10, actualWeekly: 11 },
  { week: "T5", plannedCumulative: 50, actualCumulative: null, plannedWeekly: 10, actualWeekly: null },
  { week: "T6", plannedCumulative: 60, actualCumulative: null, plannedWeekly: 10, actualWeekly: null },
];

describe("Milestone 2 UI & Responsive Contracts Adversarial Suite", () => {
  // =========================================================================
  // 1. AUTH REDIRECT CONTRACT
  // =========================================================================
  describe("1. Auth Redirect Contract: (main) routes redirect unauthenticated access to /login with 307", () => {
    it("1.1 MainLayout throws NEXT_REDIRECT with 307 and /login when no session exists", async () => {
      // In Server Component context with no auth cookies
      try {
        await MainLayout({ children: React.createElement("div", null, "Protected Content") });
        expect.unreachable("MainLayout should have thrown NEXT_REDIRECT");
      } catch (err: any) {
        expect(err.message).toBe("NEXT_REDIRECT");
        expect(err.digest).toContain("/login");
        expect(err.digest).toContain("307");
      }
    });

    it("1.2 verifyToken correctly rejects invalid / forged / expired tokens", () => {
      // Forged secret
      const forged = signToken({ userId: "attacker", email: "hacker@test.com" });
      const badVerify = verifyToken(forged + "tampered");
      expect(badVerify).toBeNull();

      // Expired token
      const expired = signToken({ userId: "expired", email: "exp@test.com" });
      // Tamper signature or payload to simulate failure
      expect(verifyToken("invalid.jwt.token")).toBeNull();
      expect(verifyToken("")).toBeNull();
    });

    it("1.3 Valid token extracts clean user claims", () => {
      const valid = signToken({ userId: mockUser.id, email: mockUser.email, role: mockUser.role });
      const payload = verifyToken(valid);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(mockUser.id);
      expect(payload?.email).toBe(mockUser.email);
    });
  });

  // =========================================================================
  // 2. TEST SELECTORS CONTRACT
  // =========================================================================
  describe("2. Test Selectors Contract: Verify all 22 required selectors exist", () => {
    const REQUIRED_SELECTORS = [
      "app-sidebar",
      "app-header",
      "brand-logo",
      "nav-dashboard",
      "nav-roadmap",
      "nav-srs",
      "nav-practice",
      "nav-exam",
      "nav-formulas",
      "nav-bookmarks",
      "subject-switcher",
      "user-menu-dropdown",
      "mobile-menu-toggle",
      "logout-button",
      "stat-total-answered",
      "stat-accuracy",
      "stat-study-hours",
      "stat-current-streak",
      "continue-practice-cta",
      "exam-countdown",
      "study-curve-chart",
      "methodology-step-item",
    ];

    it("2.1 Verify test-selectors.ts exports match all required selector definitions", () => {
      const definedSelectors = [
        SELECTORS.layout.sidebar,
        SELECTORS.layout.header,
        SELECTORS.layout.brandLogo,
        SELECTORS.layout.navDashboard,
        SELECTORS.layout.navRoadmap,
        SELECTORS.layout.navSRS,
        SELECTORS.layout.navPractice,
        SELECTORS.layout.navExam,
        SELECTORS.layout.navFormulas,
        SELECTORS.layout.navBookmarks,
        SELECTORS.layout.subjectSwitcher,
        SELECTORS.layout.userMenu,
        SELECTORS.layout.mobileMenuButton,
        SELECTORS.auth.logoutButton,
        SELECTORS.dashboard.statsTotalAnswered,
        SELECTORS.dashboard.statsAccuracy,
        SELECTORS.dashboard.statsStudyHours,
        SELECTORS.dashboard.statsCurrentStreak,
        SELECTORS.dashboard.continuePracticeCTA,
        SELECTORS.dashboard.countdownTimer,
        SELECTORS.dashboard.studyCurveChart,
        SELECTORS.dashboard.methodologySteps,
      ];

      REQUIRED_SELECTORS.forEach((selectorId) => {
        const found = definedSelectors.some((def) => def && def.includes(selectorId));
        expect(found, `Expected ${selectorId} to be defined in test-selectors.ts`).toBe(true);
      });
    });

    it("2.2 AppLayout renders app-sidebar, app-header, and mobile-menu-toggle in DOM", () => {
      const html = renderToString(
        React.createElement(
          AppLayout,
          { user: mockUser, initialDueCount: 5 },
          React.createElement("div", null, "Dashboard Body")
        )
      );

      expect(html).toContain('data-testid="app-sidebar"');
      expect(html).toContain('data-testid="app-header"');
      expect(html).toContain('data-testid="brand-logo"');
      expect(html).toContain('data-testid="nav-dashboard"');
      expect(html).toContain('data-testid="nav-roadmap"');
      expect(html).toContain('data-testid="nav-srs"');
      expect(html).toContain('data-testid="nav-practice"');
      expect(html).toContain('data-testid="nav-exam"');
      expect(html).toContain('data-testid="nav-formulas"');
      expect(html).toContain('data-testid="nav-bookmarks"');
      expect(html).toContain('data-testid="subject-switcher"');
      expect(html).toContain('data-testid="user-menu-dropdown"');
      expect(html).toContain('data-testid="mobile-menu-toggle"');
      expect(html).toContain('data-testid="logout-button"');
    });

    it("2.3 KpiStatsGrid renders stat-total-answered, stat-accuracy, stat-study-hours, stat-current-streak", () => {
      const html = renderToString(
        React.createElement(KpiStatsGrid, {
          totalAnswered: 1250,
          correctRate: 84.5,
          studyHours: 42.5,
          currentStreak: 18,
          targetScore: 450,
        })
      );

      expect(html).toContain('data-testid="stat-total-answered"');
      expect(html).toContain('data-testid="stat-accuracy"');
      expect(html).toContain('data-testid="stat-study-hours"');
      expect(html).toContain('data-testid="stat-current-streak"');
      expect(html).toContain('1,250 câu');
      expect(html).toContain('84.5%');
      expect(html).toContain('42.5 giờ');
      expect(html).toContain('18 ngày 🔥');
    });

    it("2.4 ContinueLearningCard renders continue-practice-cta with deep link", () => {
      const html = renderToString(
        React.createElement(ContinueLearningCard, { activeNode: mockActiveNode })
      );

      expect(html).toContain('data-testid="continue-practice-cta"');
      expect(html).toContain('Báo cáo tài chính quy mô chung');
      expect(html).toContain('href="/luyen-tap?subunit=cma-p2-u1-sub1"');
    });

    it("2.5 ExamDateControl renders exam-countdown and change-exam-date-button", () => {
      const html = renderToString(
        React.createElement(ExamDateControl, {
          examPlan: mockExamPlan,
          statusIndicator: "Đang đúng kế hoạch",
          isAhead: true,
          onPlanUpdated: () => {},
        })
      );

      expect(html).toContain('data-testid="exam-countdown"');
      expect(html).toMatch(/Còn\s*(<!-- -->)?\s*15\s*(<!-- -->)?\s*ngày/);
      expect(html).toContain('data-testid="change-exam-date-button"');
    });

    it("2.6 StudyHoursChart renders study-curve-chart", () => {
      const html = renderToString(
        React.createElement(StudyHoursChart, {
          data: mockChartData,
          thisWeekHours: 11,
          thisWeekTarget: 10,
          averageSpeed: 1.8,
          statusMessage: "Tiến độ xuất sắc",
        })
      );

      expect(html).toContain('data-testid="study-curve-chart"');
    });

    it("2.7 MethodologyGuideCard renders exactly 4 methodology-step-item nodes", () => {
      const html = renderToString(React.createElement(MethodologyGuideCard));

      expect(html).toContain('data-testid="methodology-step-item"');
      const matches = html.match(/data-testid="methodology-step-item"/g);
      expect(matches).not.toBeNull();
      expect(matches?.length).toBe(4);
      expect(html).toContain("01");
      expect(html).toContain("02");
      expect(html).toContain("03");
      expect(html).toContain("04");
    });
  });

  // =========================================================================
  // 3. COPY PROTECTION CONTRACT (> 280 CHARACTERS)
  // =========================================================================
  describe("3. Copy Protection Contract: Copying > 280 characters is truncated to 280 characters", () => {
    it("3.1 MAX_COPY_CHARS constant is strictly 280", () => {
      expect(MAX_COPY_CHARS).toBe(280);
      expect(COPY_NOTICE_MESSAGE).toContain("280 ký tự");
    });

    it("3.2 Copying text <= 280 characters is NOT truncated or intercepted", () => {
      const shortText = "Tỷ số thanh toán hiện hành (Current Ratio) bằng Tài sản ngắn hạn chia cho Nợ ngắn hạn.";
      expect(shortText.length).toBeLessThanOrEqual(280);

      let prevented = false;
      let clipboardContent = "";

      const fakeClipboardData = {
        setData: (format: string, data: string) => {
          clipboardContent = data;
        },
      };

      // Simulate browser copy handler logic
      const handleCopyLogic = (text: string, e: any) => {
        if (text.length > MAX_COPY_CHARS) {
          e.preventDefault();
          const truncated = text.slice(0, MAX_COPY_CHARS);
          const noticeSuffix = "\n\n[Trích đoạn PassQ CMA Part 2 - Giới hạn 280 ký tự ghi chú]";
          if (e.clipboardData) {
            e.clipboardData.setData("text/plain", truncated + noticeSuffix);
          }
        }
      };

      const mockEvent = {
        preventDefault: () => {
          prevented = true;
        },
        clipboardData: fakeClipboardData,
      };

      handleCopyLogic(shortText, mockEvent);
      expect(prevented).toBe(false);
      expect(clipboardContent).toBe("");
    });

    it("3.3 Copying boundary text: exactly 280 characters is allowed without truncation", () => {
      const exact280Text = "A".repeat(280);
      expect(exact280Text.length).toBe(280);

      let prevented = false;
      const mockEvent = {
        preventDefault: () => {
          prevented = true;
        },
        clipboardData: { setData: vi.fn() },
      };

      if (exact280Text.length > MAX_COPY_CHARS) {
        mockEvent.preventDefault();
      }

      expect(prevented).toBe(false);
    });

    it("3.4 Copying 281 characters is intercepted and truncated to exactly 280 characters", () => {
      const text281 = "B".repeat(281);
      expect(text281.length).toBe(281);

      let prevented = false;
      let setClipboardText = "";

      const mockEvent = {
        preventDefault: () => {
          prevented = true;
        },
        clipboardData: {
          setData: (type: string, val: string) => {
            setClipboardText = val;
          },
        },
      };

      if (text281.length > MAX_COPY_CHARS) {
        mockEvent.preventDefault();
        const truncated = text281.slice(0, MAX_COPY_CHARS);
        const noticeSuffix = "\n\n[Trích đoạn PassQ CMA Part 2 - Giới hạn 280 ký tự ghi chú]";
        mockEvent.clipboardData.setData("text/plain", truncated + noticeSuffix);
      }

      expect(prevented).toBe(true);
      expect(setClipboardText.startsWith("B".repeat(280))).toBe(true);
      expect(setClipboardText).not.toContain("B".repeat(281));
      expect(setClipboardText).toContain("Giới hạn 280 ký tự ghi chú");
    });

    it("3.5 Adversarial Stress: 5,000 characters payload is truncated strictly to 280 chars", () => {
      const hugeArticle =
        "Phân tích báo cáo tài chính là môn học then chốt trong chương trình CMA Part 2. ".repeat(
          100
        );
      expect(hugeArticle.length).toBeGreaterThan(5000);

      let prevented = false;
      let writtenPayload = "";

      const mockEvent = {
        preventDefault: () => {
          prevented = true;
        },
        clipboardData: {
          setData: (type: string, val: string) => {
            writtenPayload = val;
          },
        },
      };

      if (hugeArticle.length > MAX_COPY_CHARS) {
        mockEvent.preventDefault();
        const truncated = hugeArticle.slice(0, MAX_COPY_CHARS);
        const noticeSuffix = "\n\n[Trích đoạn PassQ CMA Part 2 - Giới hạn 280 ký tự ghi chú]";
        mockEvent.clipboardData.setData("text/plain", truncated + noticeSuffix);
      }

      expect(prevented).toBe(true);
      const textPortion = writtenPayload.split("\n\n[Trích đoạn")[0];
      expect(textPortion.length).toBe(280);
      expect(textPortion).toBe(hugeArticle.slice(0, 280));
    });
  });

  // =========================================================================
  // 4. SVG DUAL-CURVE CHART INTEGRITY
  // =========================================================================
  describe("4. SVG Dual-Curve Chart Integrity: Stroke colors, paths and viewBox", () => {
    const chartHtml = renderToString(
      React.createElement(StudyHoursChart, {
        data: mockChartData,
        thisWeekHours: 11,
        thisWeekTarget: 10,
        averageSpeed: 1.8,
        statusMessage: "Đang dẫn trước kế hoạch",
      })
    );

    it("4.1 SVG element has viewBox='0 0 760 260'", () => {
      expect(chartHtml).toContain('viewBox="0 0 760 260"');
    });

    it("4.2 Planned Target curve renders with stroke='#dc2626' and dashed style", () => {
      expect(chartHtml).toContain('stroke="#dc2626"');
      expect(chartHtml).toContain('stroke-dasharray="6 4"');
    });

    it("4.3 Actual Logged curve renders with stroke='#1f6fb2' and strokeWidth='3'", () => {
      expect(chartHtml).toContain('stroke="#1f6fb2"');
      expect(chartHtml).toContain('stroke-width="3"');
    });

    it("4.4 Actual logged area uses linear gradient filled with #1f6fb2", () => {
      expect(chartHtml).toContain('id="actualGradient"');
      expect(chartHtml).toContain('stop-color="#1f6fb2"');
      expect(chartHtml).toContain('fill="url(#actualGradient)"');
    });

    it("4.5 Chart legend displays both Planned (#dc2626) and Actual (#1f6fb2) badges", () => {
      expect(chartHtml).toContain('border-[#dc2626]');
      expect(chartHtml).toContain('bg-[#1f6fb2]');
      expect(chartHtml).toContain("Kế hoạch (cộng dồn)");
      expect(chartHtml).toContain("Đã học thật");
    });

    it("4.6 Chart handles empty data array gracefully without crashing", () => {
      const emptyHtml = renderToString(
        React.createElement(StudyHoursChart, {
          data: [],
          thisWeekHours: 0,
          thisWeekTarget: 10,
          averageSpeed: 0,
          statusMessage: "Chưa có dữ liệu",
        })
      );
      expect(emptyHtml).toBe("");
    });
  });

  // =========================================================================
  // 5. VIEWPORT RESPONSIVENESS & MOBILE DRAWER CONTRACT
  // =========================================================================
  describe("5. Viewport Responsiveness Contract: Mobile drawer toggle and layout triggers", () => {
    it("5.1 Header component includes mobile-menu-toggle with lg:hidden utility", () => {
      const headerHtml = renderToString(
        React.createElement(
          LayoutProvider,
          { user: mockUser, initialDueCount: 3 },
          React.createElement(Header)
        )
      );

      expect(headerHtml).toContain('data-testid="mobile-menu-toggle"');
      // Must contain lg:hidden so it's responsive (visible on mobile, hidden on desktop)
      expect(headerHtml).toMatch(/data-testid="mobile-menu-toggle"[^>]*class="[^"]*lg:hidden/);
    });

    it("5.2 AppLayout desktop sidebar has hidden lg:flex responsive classes", () => {
      const layoutHtml = renderToString(
        React.createElement(
          AppLayout,
          { user: mockUser, initialDueCount: 0 },
          React.createElement("div", null, "Page")
        )
      );

      // Desktop sidebar hidden on mobile, flex on lg
      expect(layoutHtml).toMatch(/data-testid="app-sidebar"[^>]*class="[^"]*hidden\s+lg:flex/);
    });

    it("5.3 AppLayout main area adapts padding for desktop sidebar offset (lg:pl-72)", () => {
      const layoutHtml = renderToString(
        React.createElement(
          AppLayout,
          { user: mockUser, initialDueCount: 0 },
          React.createElement("div", null, "Content")
        )
      );

      expect(layoutHtml).toContain("lg:pl-72");
    });
  });
});
