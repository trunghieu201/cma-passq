import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        { error: "Chưa đăng nhập (Token không tồn tại)." },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: "Phiên làm việc không hợp lệ hoặc đã hết hạn." },
        { status: 401 }
      );
    }

    const userId = payload.userId;

    // 1. Fetch User with Profile, Stats & Streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        targetExamDate: true,
        weeklyHours: true,
        dailyGoalCount: true,
        dailyGoalMin: true,
        studyMode: true,
        targetScore: true,
        stats: true,
        streak: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Người dùng không tồn tại." },
        { status: 401 }
      );
    }

    // 2. Resolve Active Learning Node ("Vào học")
    const activeNodeProgress = await prisma.userNodeProgress.findFirst({
      where: { userId, status: "in_progress" },
      orderBy: { updatedAt: "desc" },
      include: {
        subunit: {
          include: {
            unit: {
              include: { section: true },
            },
          },
        },
      },
    });

    let activeSubunit: any = activeNodeProgress?.subunit;
    let completionPct = Math.round(activeNodeProgress?.accuracyPct || 0);

    // Fallback: First subunit in curriculum
    if (!activeSubunit) {
      activeSubunit = await prisma.subunit.findFirst({
        orderBy: [{ unit: { orderIndex: "asc" } }, { orderIndex: "asc" }],
        include: {
          unit: {
            include: { section: true },
          },
        },
      });
      completionPct = 0;
    }

    // 3. Due Items ("Ôn tập hôm nay")
    const now = new Date();
    const dueFlashcardsCount = await prisma.userQuestionReview.count({
      where: {
        userId,
        dueDate: { lte: now },
      },
    });

    // 4. Weakness Items (Questions with memory lapses or last incorrect result)
    const weaknessQuestionsCount = await prisma.userQuestionReview.count({
      where: {
        userId,
        OR: [{ lapses: { gt: 0 } }, { lastResult: false }],
      },
    });

    // 5. Exam Date Countdown
    const defaultExamDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const examDate = user.targetExamDate ? new Date(user.targetExamDate) : defaultExamDate;
    const diffTime = examDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const examDateFormatted = `${String(examDate.getDate()).padStart(2, "0")}/${String(
      examDate.getMonth() + 1
    ).padStart(2, "0")}/${examDate.getFullYear()}`;

    // 6. User Stats & Metrics
    const totalAnswered = user.stats?.totalAnswered || 0;
    const totalCorrect = user.stats?.totalCorrect || 0;
    const totalTimeSeconds = user.stats?.totalTimeSeconds || 0;
    const correctRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const loggedStudyHours = Math.round((totalTimeSeconds / 3600) * 10) / 10;
    const currentStreak = user.streak?.currentStreak || user.stats?.streakDays || 0;
    const longestStreak = user.streak?.longestStreak || currentStreak;
    const freezesLeft = user.streak?.freezesLeft ?? 1;

    // 7. Weekly Activity & Dual Curve Generation
    const weeklyHoursTarget = user.weeklyHours || 10;
    const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);

    const activities = await prisma.userDailyActivity.findMany({
      where: {
        userId,
        activityDate: { gte: sixWeeksAgo },
      },
      orderBy: { activityDate: "asc" },
    });

    // Current week study hours
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay() || 7; // Monday is 1
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);

    const thisWeekSeconds = activities
      .filter((a) => new Date(a.activityDate) >= startOfWeek)
      .reduce((sum, a) => sum + a.timeSpentSeconds, 0);
    const thisWeekHours =
      thisWeekSeconds > 0
        ? Math.round((thisWeekSeconds / 3600) * 10) / 10
        : loggedStudyHours > 0
        ? Math.min(weeklyHoursTarget, loggedStudyHours)
        : 0;

    // Generate 6-week timeline (3 past weeks, current week, 2 future weeks)
    const chartData = [];
    let cumulativeTarget = 0;
    let cumulativeActual = 0;

    for (let w = 1; w <= 6; w++) {
      cumulativeTarget += weeklyHoursTarget;
      if (w <= 4) {
        let weeklyAdd = 0;
        if (w === 4) {
          weeklyAdd = thisWeekHours;
        } else if (loggedStudyHours > 0) {
          weeklyAdd = Math.max(2, Math.round((loggedStudyHours / 3) * 10) / 10);
        } else {
          weeklyAdd = 0;
        }
        cumulativeActual += weeklyAdd;
        chartData.push({
          week: w === 4 ? "Tuần này" : `Tuần ${w}`,
          plannedCumulative: Math.round(cumulativeTarget * 10) / 10,
          actualCumulative: Math.round(cumulativeActual * 10) / 10,
          plannedWeekly: weeklyHoursTarget,
          actualWeekly: weeklyAdd,
        });
      } else {
        // Future planned weeks
        chartData.push({
          week: `Tuần ${w}`,
          plannedCumulative: Math.round(cumulativeTarget * 10) / 10,
          actualCumulative: null,
          plannedWeekly: weeklyHoursTarget,
          actualWeekly: null,
        });
      }
    }

    const studyHoursTarget = chartData[3].plannedCumulative;
    const effectiveActualHours =
      cumulativeActual > 0 ? cumulativeActual : loggedStudyHours;
    const studyHoursDelta = Math.round((effectiveActualHours - studyHoursTarget) * 10) / 10;
    const statusIndicator =
      studyHoursDelta >= 0
        ? `Đúng tiến độ (+${studyHoursDelta.toFixed(1)} giờ)`
        : `Cần cố gắng (${studyHoursDelta.toFixed(1)} giờ)`;

    const averageSpeedMinPerQ =
      totalAnswered > 0
        ? Math.round((totalTimeSeconds / 60 / totalAnswered) * 10) / 10
        : 1.6;

    return NextResponse.json({
      stats: {
        totalQuestionsAnswered: totalAnswered,
        totalCorrect,
        correctRate,
        totalTimeSeconds,
        studyHoursActual: effectiveActualHours,
        studyHoursTarget,
        studyHoursDelta,
        statusIndicator,
        currentStreak,
        longestStreak,
        freezesLeft,
        averageSpeedMinPerQ,
        thisWeekHours,
        thisWeekTargetHours: weeklyHoursTarget,
        targetScore: user.targetScore || 400,
      },
      examPlan: {
        targetExamDate: examDate.toISOString(),
        examDateFormatted,
        daysRemaining,
        weeklyHours: weeklyHoursTarget,
        studyMode: user.studyMode || "standard",
        targetScore: user.targetScore || 400,
      },
      activeNode: activeSubunit
        ? {
            id: activeSubunit.id,
            code: activeSubunit.code,
            title: activeSubunit.title,
            unitNumber: activeSubunit.unit.unitNumber,
            unitTitle: activeSubunit.unit.title,
            sectionCode: activeSubunit.unit.section.code,
            sectionTitle: activeSubunit.unit.section.title,
            completionPct,
            continueUrl: `/lo-trinh?activeNode=${activeSubunit.id}`,
          }
        : null,
      dailyTodos: {
        dueFlashcardsCount,
        practiceQuestionsGoal: user.dailyGoalCount || 10,
        weaknessQuestionsCount,
      },
      chartData,
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi tải dữ liệu Bảng điều khiển." },
      { status: 500 }
    );
  }
}
