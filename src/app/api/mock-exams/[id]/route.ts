import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mockId = params.id;
    if (!mockId) {
      return NextResponse.json(
        { error: "Mock Exam ID không hợp lệ." },
        { status: 400 }
      );
    }

    const mock = await prisma.mockExam.findUnique({
      where: { id: mockId },
      include: {
        questions: {
          orderBy: { seqOrder: "asc" },
          include: {
            question: {
              include: {
                choices: {
                  orderBy: { orderIndex: "asc" },
                  select: {
                    id: true,
                    choiceKey: true,
                    content: true,
                    isCorrect: true,
                    distractorAnalysis: true,
                  },
                },
                section: {
                  select: { code: true, title: true },
                },
                unit: {
                  select: { unitNumber: true, title: true },
                },
              },
            },
          },
        },
      },
    });

    if (!mock) {
      return NextResponse.json(
        { error: "Không tìm thấy đề thi thử." },
        { status: 404 }
      );
    }

    const questions = mock.questions.map((mq) => ({
      seqOrder: mq.seqOrder,
      id: mq.question.id,
      stem: mq.question.stem,
      basisScenario: mq.question.basisScenario,
      correctChoice: mq.question.correctChoice,
      explanation: mq.question.explanation,
      citation: mq.question.citation,
      section: mq.question.section,
      unit: mq.question.unit,
      choices: mq.question.choices,
    }));

    return NextResponse.json({
      id: mock.id,
      name: mock.name,
      part: mock.part,
      durationMinutes: mock.durationMinutes,
      questionCount: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Mock exam detail API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải đề thi thử." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để nộp bài thi thử." },
        { status: 401 }
      );
    }

    const mockId = params.id;
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Dữ liệu nộp bài không đúng định dạng JSON." },
        { status: 400 }
      );
    }
    const { answers = {}, totalTimeSeconds = 0 } = body;

    const mock = await prisma.mockExam.findUnique({
      where: { id: mockId },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                correctChoice: true,
                sectionId: true,
              },
            },
          },
        },
      },
    });

    if (!mock) {
      return NextResponse.json(
        { error: "Không tìm thấy đề thi." },
        { status: 404 }
      );
    }

    let correctCount = 0;
    const totalQuestions = mock.questions.length || 100;
    const sectionBreakdown: Record<string, { total: number; correct: number }> = {};

    for (const mq of mock.questions) {
      const q = mq.question;
      const userChoice = answers[q.id];
      const isCorrect = userChoice && userChoice.toUpperCase() === q.correctChoice.toUpperCase();

      if (isCorrect) correctCount++;

      const sec = q.sectionId || "Other";
      if (!sectionBreakdown[sec]) {
        sectionBreakdown[sec] = { total: 0, correct: 0 };
      }
      sectionBreakdown[sec].total++;
      if (isCorrect) sectionBreakdown[sec].correct++;
    }

    // IMA Scaled Score formula: 0 to 500 scaled score, passing score is 360 (approx 72%)
    // Base formula: 200 + (correct / total) * 300
    const rawRatio = totalQuestions > 0 ? correctCount / totalQuestions : 0;
    const scaledScore = Math.min(500, Math.max(0, Math.round(200 + rawRatio * 300)));
    const isPassed = scaledScore >= 360;

    // Save attempt
    const attempt = await prisma.userExamAttempt.create({
      data: {
        userId: currentUser.id,
        mockId,
        score: correctCount,
        totalQuestions,
        totalTimeSeconds: Number(totalTimeSeconds) || 0,
        scaledScore,
        isPassed,
        answersJson: JSON.stringify(answers),
        sectionStatsJson: JSON.stringify(sectionBreakdown),
      },
    });

    // Update study stats
    const now = new Date();
    await prisma.userStudyStats.upsert({
      where: { userId: currentUser.id },
      update: {
        totalAnswered: { increment: totalQuestions },
        totalCorrect: { increment: correctCount },
        totalTimeSeconds: { increment: Number(totalTimeSeconds) || 0 },
        lastActiveDate: now,
      },
      create: {
        userId: currentUser.id,
        totalAnswered: totalQuestions,
        totalCorrect: correctCount,
        totalTimeSeconds: Number(totalTimeSeconds) || 0,
        lastActiveDate: now,
      },
    });

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      score: correctCount,
      totalQuestions,
      scaledScore,
      isPassed,
      sectionBreakdown,
      completedAt: attempt.completedAt,
    });
  } catch (error) {
    console.error("Mock exam submit API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi nộp bài thi thử." },
      { status: 500 }
    );
  }
}
