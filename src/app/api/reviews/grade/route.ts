import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để ghi nhận kết quả ôn tập." },
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
    const { questionId, rating, selectedChoice, timeSpentMs = 0 } = body;

    if (!questionId || rating === undefined) {
      return NextResponse.json(
        { error: "Thiếu questionId hoặc rating (0 - 5)." },
        { status: 400 }
      );
    }

    const q = Math.max(0, Math.min(5, Math.round(Number(rating))));
    const isSuccess = q >= 3;

    // Fetch existing review
    let review = await prisma.userQuestionReview.findUnique({
      where: {
        userId_questionId: {
          userId,
          questionId,
        },
      },
    });

    const currentEF = review?.easeFactor || 2.5;
    const currentConsecutive = review?.consecutiveCorrect || 0;
    const currentInterval = review?.intervalDays || 0;
    const currentStage = review?.stage || 0;
    const lapses = review?.lapses || 0;

    // 1. SuperMemo SM-2 Ease Factor calculation
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    let newEF = currentEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (newEF < 1.3) newEF = 1.3;
    newEF = Math.round(newEF * 100) / 100;

    // 2. Interval & Consecutive Correct calculation
    let newInterval = 1;
    let newConsecutive = 0;
    let newLapses = lapses;
    let newStage = 0;

    if (q < 3) {
      // Failed / Forgotten
      newInterval = 1;
      newConsecutive = 0;
      newLapses += 1;
      newStage = 0;
    } else {
      // Successful recall
      newConsecutive = currentConsecutive + 1;
      if (newConsecutive === 1) {
        newInterval = 1;
        newStage = 1;
      } else if (newConsecutive === 2) {
        newInterval = 3;
        newStage = 2;
      } else if (newConsecutive === 3) {
        newInterval = 7;
        newStage = 3;
      } else if (newConsecutive === 4) {
        newInterval = 16;
        newStage = 4;
      } else {
        newInterval = Math.max(25, Math.round(currentInterval * newEF));
        newStage = 5;
      }
    }

    const now = new Date();
    const newDueDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

    // 3. Upsert UserQuestionReview
    const updatedReview = await prisma.userQuestionReview.upsert({
      where: {
        userId_questionId: {
          userId,
          questionId,
        },
      },
      update: {
        stage: newStage,
        intervalDays: newInterval,
        easeFactor: newEF,
        consecutiveCorrect: newConsecutive,
        lapses: newLapses,
        totalAttempts: { increment: 1 },
        totalCorrect: { increment: isSuccess ? 1 : 0 },
        dueDate: newDueDate,
        lastReviewedAt: now,
        lastResult: isSuccess,
        lastSelectedChoice: selectedChoice || null,
        averageTimeSpentMs: Number(timeSpentMs) || 0,
      },
      create: {
        userId,
        questionId,
        stage: newStage,
        intervalDays: newInterval,
        easeFactor: newEF,
        consecutiveCorrect: newConsecutive,
        lapses: newLapses,
        totalAttempts: 1,
        totalCorrect: isSuccess ? 1 : 0,
        dueDate: newDueDate,
        lastReviewedAt: now,
        lastResult: isSuccess,
        lastSelectedChoice: selectedChoice || null,
        averageTimeSpentMs: Number(timeSpentMs) || 0,
      },
    });

    // 4. Update Daily Activity
    const todayDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const timeSpentSec = Math.round((Number(timeSpentMs) || 0) / 1000);

    await prisma.userDailyActivity.upsert({
      where: {
        userId_activityDate: {
          userId,
          activityDate: todayDate,
        },
      },
      update: {
        questionsSolved: { increment: 1 },
        correctCount: { increment: isSuccess ? 1 : 0 },
        timeSpentSeconds: { increment: Math.max(5, timeSpentSec) },
      },
      create: {
        userId,
        activityDate: todayDate,
        questionsSolved: 1,
        correctCount: isSuccess ? 1 : 0,
        timeSpentSeconds: Math.max(5, timeSpentSec),
      },
    });

    // 5. Update UserStudyStats
    await prisma.userStudyStats.upsert({
      where: { userId },
      update: {
        totalAnswered: { increment: 1 },
        totalCorrect: { increment: isSuccess ? 1 : 0 },
        totalTimeSeconds: { increment: Math.max(5, timeSpentSec) },
        lastActiveDate: now,
      },
      create: {
        userId,
        totalAnswered: 1,
        totalCorrect: isSuccess ? 1 : 0,
        totalTimeSeconds: Math.max(5, timeSpentSec),
        lastActiveDate: now,
      },
    });

    return NextResponse.json({
      success: true,
      questionId,
      rating: q,
      isSuccess,
      newIntervalDays: newInterval,
      newEaseFactor: newEF,
      newStage,
      nextDueDate: newDueDate.toISOString(),
    });
  } catch (error) {
    console.error("SRS grade API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi chấm điểm thuật toán SM-2." },
      { status: 500 }
    );
  }
}
