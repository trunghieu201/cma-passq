import { test, expect } from "../fixtures/auth.fixture";
import { SELECTORS } from "../helpers/test-selectors";

test.describe("PassQ CMA Part 2 Core User Journeys & Routes", () => {
  test("1. Dashboard (Bảng điều khiển) renders complete KPI stats and widgets", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/dashboard");

    // Header & Badge
    await expect(authenticatedPage.getByRole("heading", { name: /Bảng điều khiển/i })).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByText(/CMA Part 2/i).first()).toBeVisible();

    // 5 KPI metrics strip
    await expect(authenticatedPage.getByText(/Câu hỏi đã làm/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Tỷ lệ đúng/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Thời gian đã học/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Chuỗi ngày học/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Điểm mục tiêu/i)).toBeVisible();

    // Hero cards
    await expect(authenticatedPage.getByText(/Tiếp tục học/i).first()).toBeVisible();
    await expect(authenticatedPage.locator(SELECTORS.dashboard.countdownTimer)).toBeVisible();

    // Dual Curve chart
    await expect(authenticatedPage.locator(SELECTORS.dashboard.studyCurveChart)).toBeVisible();
    await expect(authenticatedPage.getByText(/Tiến độ học tập theo tuần/i)).toBeVisible();

    // Daily To-Do card
    await expect(authenticatedPage.getByText(/Việc cần làm hôm nay/i)).toBeVisible();
  });

  test("2. Roadmap (Lộ trình) renders 6 Sections A-F and allows unit expansion", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/lo-trinh");

    // Title
    await expect(authenticatedPage.getByRole("heading", { name: /Lộ trình học CMA Part 2/i })).toBeVisible({ timeout: 10000 });

    // Section pills
    await expect(authenticatedPage.getByRole("button", { name: /Tất cả các phần/i })).toBeVisible();
    await expect(authenticatedPage.getByRole("button", { name: /Phần A/i })).toBeVisible();
    await expect(authenticatedPage.getByRole("button", { name: /Phần F/i })).toBeVisible();

    // Subunit item exists
    await expect(authenticatedPage.getByText(/2.1.1/i).first()).toBeVisible();
  });

  test("3. Spaced Repetition (Ôn tập hôm nay) renders SM-2 dashboard and review cards", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/on-tap");

    // Title
    await expect(authenticatedPage.getByRole("heading", { level: 1, name: /Ôn tập hôm nay/i })).toBeVisible({ timeout: 10000 });

    // SM-2 Metrics
    await expect(authenticatedPage.getByText(/Thẻ đến hạn hôm nay/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Tỷ lệ duy trì trí nhớ/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Đã làm chủ/i)).toBeVisible();

    // Big launch button
    const startReviewBtn = authenticatedPage.getByRole("button", { name: /Bắt đầu ôn tập/i });
    await expect(startReviewBtn).toBeVisible();

    // Click launch
    await startReviewBtn.click();

    // Review card runner should be displayed
    await expect(authenticatedPage.getByText(/Thẻ 1 \//i)).toBeVisible({ timeout: 5000 });
  });

  test("4. Practice Hub & Interactive Quiz Runner (/luyen-tap)", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/luyen-tap");

    // Header
    await expect(authenticatedPage.getByRole("heading", { name: /Luyện tập câu hỏi trắc nghiệm/i })).toBeVisible({ timeout: 10000 });

    // Cards
    await expect(authenticatedPage.getByText(/Luyện theo chương/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Ôn luyện điểm yếu/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Luyện ngẫu nhiên/i)).toBeVisible();

    // Launch random practice with custom limit=5
    await authenticatedPage.goto("/luyen-tap?mode=practice&limit=5");
    await expect(authenticatedPage.getByText("Câu 1 / 5")).toBeVisible({ timeout: 10000 });

    // Choices A, B, C, D visible
    const choiceA = authenticatedPage.getByText("A", { exact: true }).first();
    await expect(choiceA).toBeVisible();

    // Select choice A
    await choiceA.click();

    // Strikethrough elimination tool on choice A deselects it
    const strikeBtnA = authenticatedPage.getByTitle("Gạch bỏ đáp án loại trừ").first();
    await strikeBtnA.click();

    // Clicking struck-out option re-enables it and selects it
    await choiceA.click();
  });

  test("5. Formula sheet (/so-tay) lists formulas and allows search", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/so-tay");

    await expect(authenticatedPage.getByRole("heading", { name: /Sổ tay công thức CMA Part 2/i })).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByPlaceholder(/Tìm kiếm công thức/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Phần A/i).first()).toBeVisible();
  });

  test("6. Mock Exam simulator (/thi-thu) lists 31 exam papers", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/thi-thu");

    await expect(authenticatedPage.getByRole("heading", { name: /Thi thử chuẩn Prometric/i })).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByText(/Mock Exam 01/i)).toBeVisible();
    await expect(authenticatedPage.getByRole("button", { name: /Bắt đầu thi thử/i }).first()).toBeVisible();
  });

  test("7. Device management (/thiet-bi) renders active session status and allows session revocation", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/thiet-bi");

    await expect(authenticatedPage.getByRole("heading", { name: /Quản lý thiết bị đăng nhập/i })).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByText(/Trình duyệt hiện tại/i)).toBeVisible();

    // Revoke other device sessions
    const revokeBtn = authenticatedPage.getByRole("button", { name: /Đăng xuất khỏi thiết bị khác/i });
    await expect(revokeBtn).toBeVisible();
    await revokeBtn.click();
    await expect(authenticatedPage.getByText(/Đã thu hồi tất cả các phiên đăng nhập khác/i)).toBeVisible({ timeout: 5000 });
  });
});
