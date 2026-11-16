import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để lưu kết quả bài thi." },
        { status: 401 }
      );
    }

    const userId = currentUser.id;
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
    }
    const { sessionId, subunitId, timeSpentSec = 0 } = body;

    let totalAnsweredInQuiz = 0;
    let correctCountInQuiz = 0;
    let sessionAnswers: any[] = [];

    if (sessionId) {
      const session = await prisma.quizSession.findUnique({
        where: { id: sessionId },
        include: { answers: true },
      });

      if (session && session.userId === userId) {
        sessionAnswers = session.answers;
        totalAnsweredInQuiz = session.answers.length;
        correctCountInQuiz = session.answers.filter((a) => a.isCorrect).length;

        const scorePercent =
          totalAnsweredInQuiz > 0
            ? Math.round((correctCountInQuiz / totalAnsweredInQuiz) * 100)
            : 0;

        await prisma.quizSession.update({
          where: { id: sessionId },
          data: {
            status: "COMPLETED",
            completedQuestions: totalAnsweredInQuiz,
            correctCount: correctCountInQuiz,
            scorePercent,
            timeSpentSec: Number(timeSpentSec) || 0,
            completedAt: new Date(),
          },
        });
      }
    }

    // If answers were sent directly in body (e.g. client completed without live sync)
    if (totalAnsweredInQuiz === 0 && Array.isArray(body.answers)) {
      totalAnsweredInQuiz = body.answers.length;
      correctCountInQuiz = body.answers.filter((a: any) => a.isCorrect).length;
      sessionAnswers = body.answers;
    }

    const accuracyPct =
      totalAnsweredInQuiz > 0
        ? Math.round((correctCountInQuiz / totalAnsweredInQuiz) * 100)
        : 0;

    // 1. Update Subunit Progress if subunitId is provided
    if (subunitId) {
      const stars =
        accuracyPct >= 90 ? 3 : accuracyPct >= 75 ? 2 : accuracyPct >= 50 ? 1 : 0;
      const status =
        accuracyPct >= 85 ? "mastered" : accuracyPct >= 60 ? "completed" : "in_progress";

      await prisma.userNodeProgress.upsert({
        where: {
          userId_subunitId: {
            userId,
            subunitId,
          },
        },
        update: {
          status,
          stars,
          accuracyPct,
          attemptsCount: { increment: 1 },
          masteryScore: accuracyPct,
        },
        create: {
          userId,
          subunitId,
          status,
          stars,
          accuracyPct,
          attemptsCount: 1,
          masteryScore: accuracyPct,
        },
      });
    }

    // 2. Update UserStudyStats
    const now = new Date();
    await prisma.userStudyStats.upsert({
      where: { userId },
      update: {
        totalAnswered: { increment: totalAnsweredInQuiz },
        totalCorrect: { increment: correctCountInQuiz },
        totalTimeSeconds: { increment: Number(timeSpentSec) || 0 },
        lastActiveDate: now,
      },
      create: {
        userId,
        totalAnswered: totalAnsweredInQuiz,
        totalCorrect: correctCountInQuiz,
        totalTimeSeconds: Number(timeSpentSec) || 0,
        lastActiveDate: now,
      },
    });

    // 3. Update UserDailyActivity (activityDate at 00:00:00Z)
    const todayDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    await prisma.userDailyActivity.upsert({
      where: {
        userId_activityDate: {
          userId,
          activityDate: todayDate,
        },
      },
      update: {
        questionsSolved: { increment: totalAnsweredInQuiz },
        correctCount: { increment: correctCountInQuiz },
        timeSpentSeconds: { increment: Number(timeSpentSec) || 0 },
      },
      create: {
        userId,
        activityDate: todayDate,
        questionsSolved: totalAnsweredInQuiz,
        correctCount: correctCountInQuiz,
        timeSpentSeconds: Number(timeSpentSec) || 0,
      },
    });

    // 4. Update Streak
    const userStreak = await prisma.userStreak.findUnique({
      where: { userId },
    });

    if (userStreak) {
      let currentStreak = userStreak.currentStreak;
      let longestStreak = userStreak.longestStreak;

      if (!userStreak.lastActiveDate) {
        currentStreak = 1;
      } else {
        const lastActive = new Date(userStreak.lastActiveDate);
        const diffDays = Math.floor(
          (todayDate.getTime() -
            new Date(Date.UTC(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate())).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      await prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak,
          longestStreak,
          lastActiveDate: now,
        },
      });
    } else {
      await prisma.userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: now,
        },
      });
    }

    // 5. Seed / Update SM-2 Review Records for each answered question
    for (const ans of sessionAnswers) {
      if (!ans.questionId) continue;
      const isAnsCorrect = Boolean(ans.isCorrect);

      const existingReview = await prisma.userQuestionReview.findUnique({
        where: {
          userId_questionId: {
            userId,
            questionId: ans.questionId,
          },
        },
      });

      if (!existingReview) {
        // Initial review entry: If correct, review due in 1 day, else review due today/immediately
        const intervalDays = isAnsCorrect ? 1 : 0;
        const dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

        await prisma.userQuestionReview.create({
          data: {
            userId,
            questionId: ans.questionId,
            stage: isAnsCorrect ? 1 : 0,
            intervalDays,
            easeFactor: 2.5,
            consecutiveCorrect: isAnsCorrect ? 1 : 0,
            lapses: isAnsCorrect ? 0 : 1,
            totalAttempts: 1,
            totalCorrect: isAnsCorrect ? 1 : 0,
            dueDate,
            lastReviewedAt: now,
            lastResult: isAnsCorrect,
            lastSelectedChoice: ans.selectedChoice || null,
          },
        });
      } else {
        const consecutiveCorrect = isAnsCorrect
          ? existingReview.consecutiveCorrect + 1
          : 0;
        const lapses = isAnsCorrect
          ? existingReview.lapses
          : existingReview.lapses + 1;
        const intervalDays = isAnsCorrect
          ? Math.max(1, Math.round(existingReview.intervalDays * existingReview.easeFactor))
          : 0;
        const dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

        await prisma.userQuestionReview.update({
          where: { id: existingReview.id },
          data: {
            stage: isAnsCorrect ? Math.min(5, existingReview.stage + 1) : 0,
            intervalDays,
            consecutiveCorrect,
            lapses,
            totalAttempts: { increment: 1 },
            totalCorrect: { increment: isAnsCorrect ? 1 : 0 },
            dueDate,
            lastReviewedAt: now,
            lastResult: isAnsCorrect,
            lastSelectedChoice: ans.selectedChoice || null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalAnswered: totalAnsweredInQuiz,
      correctCount: correctCountInQuiz,
      accuracyPct,
      timeSpentSec,
    });
  } catch (error) {
    console.error("Finish quiz API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi hoàn thành phiên luyện tập." },
      { status: 500 }
    );
  }
}
