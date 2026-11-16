import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để xem danh sách ôn tập hôm nay." },
        { status: 401 }
      );
    }

    const userId = currentUser.id;
    const now = new Date();

    // 1. Fetch user reviews due today or earlier
    const dueReviews = await prisma.userQuestionReview.findMany({
      where: {
        userId,
        dueDate: { lte: now },
      },
      orderBy: [{ stage: "asc" }, { dueDate: "asc" }],
      include: {
        question: {
          include: {
            choices: {
              orderBy: { orderIndex: "asc" },
            },
            subunit: {
              select: { code: true, title: true },
            },
            unit: {
              select: { unitNumber: true, title: true },
            },
            section: {
              select: { code: true, title: true },
            },
          },
        },
      },
      take: 50,
    });

    // 2. Compute SRS stats across all user reviews
    const allUserReviews = await prisma.userQuestionReview.findMany({
      where: { userId },
      select: {
        stage: true,
        totalAttempts: true,
        totalCorrect: true,
      },
    });

    const stagesCount = [0, 0, 0, 0, 0, 0];
    let totalAttempts = 0;
    let totalCorrect = 0;

    for (const r of allUserReviews) {
      const s = Math.min(5, Math.max(0, r.stage));
      stagesCount[s]++;
      totalAttempts += r.totalAttempts;
      totalCorrect += r.totalCorrect;
    }

    const retentionRate =
      totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 100;
    const masteredCount = stagesCount[4] + stagesCount[5];

    let items = dueReviews.map((r) => ({
      reviewId: r.id,
      questionId: r.questionId,
      stage: r.stage,
      intervalDays: r.intervalDays,
      easeFactor: r.easeFactor,
      consecutiveCorrect: r.consecutiveCorrect,
      lapses: r.lapses,
      question: {
        id: r.question.id,
        stem: r.question.stem,
        basisScenario: r.question.basisScenario,
        correctChoice: r.question.correctChoice,
        explanation: r.question.explanation,
        citation: r.question.citation,
        subunit: r.question.subunit,
        unit: r.question.unit,
        section: r.question.section,
        choices: r.question.choices.map((c) => ({
          id: c.id,
          choiceKey: c.choiceKey,
          content: c.content,
          isCorrect: c.isCorrect,
          distractorAnalysis: c.distractorAnalysis,
        })),
      },
    }));

    // 3. Fallback: If no cards are due today, fetch 10 high-yield questions
    let isSampleQueue = false;
    if (items.length === 0) {
      isSampleQueue = true;
      const initialQuestions = await prisma.question.findMany({
        take: 10,
        orderBy: { sequenceNum: "asc" },
        include: {
          choices: { orderBy: { orderIndex: "asc" } },
          subunit: { select: { code: true, title: true } },
          unit: { select: { unitNumber: true, title: true } },
          section: { select: { code: true, title: true } },
        },
      });

      items = initialQuestions.map((q) => ({
        reviewId: `seed-${q.id}`,
        questionId: q.id,
        stage: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        consecutiveCorrect: 0,
        lapses: 0,
        question: {
          id: q.id,
          stem: q.stem,
          basisScenario: q.basisScenario,
          correctChoice: q.correctChoice,
          explanation: q.explanation,
          citation: q.citation,
          subunit: q.subunit,
          unit: q.unit,
          section: q.section,
          choices: q.choices.map((c) => ({
            id: c.id,
            choiceKey: c.choiceKey,
            content: c.content,
            isCorrect: c.isCorrect,
            distractorAnalysis: c.distractorAnalysis,
          })),
        },
      }));
    }

    return NextResponse.json({
      dueCount: isSampleQueue ? items.length : dueReviews.length,
      isSampleQueue,
      stages: {
        stage0: stagesCount[0], // 0d (Mới / Quên)
        stage1: stagesCount[1], // 1d
        stage2: stagesCount[2], // 3d
        stage3: stagesCount[3], // 7d
        stage4: stagesCount[4], // 16d
        stage5: stagesCount[5], // 35d (Thành thạo)
      },
      retentionRate,
      masteredCount,
      totalReviewed: allUserReviews.length,
      items,
    });
  } catch (error) {
    console.error("SRS today API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải hàng đợi ôn tập hôm nay." },
      { status: 500 }
    );
  }
}
