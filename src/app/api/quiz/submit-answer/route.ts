import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để lưu câu trả lời." },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
    }
    const { sessionId, questionId, selectedChoice, timeSpentMs = 0, isFlagged = false, eliminatedKeys = [] } = body;

    if (!questionId || !selectedChoice) {
      return NextResponse.json(
        { error: "Thiếu questionId hoặc selectedChoice." },
        { status: 400 }
      );
    }

    // Verify question
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        choices: true,
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Không tìm thấy câu hỏi." },
        { status: 404 }
      );
    }

    const isCorrect = selectedChoice.toUpperCase() === question.correctChoice.toUpperCase();

    // If session ID is provided, verify session belongs to user and save answer
    if (sessionId) {
      const session = await prisma.quizSession.findUnique({
        where: { id: sessionId },
      });

      if (session && session.userId === currentUser.id) {
        await prisma.quizSessionAnswer.upsert({
          where: {
            sessionId_questionId: {
              sessionId,
              questionId,
            },
          },
          update: {
            selectedChoice: selectedChoice.toUpperCase(),
            isCorrect,
            isFlagged: Boolean(isFlagged),
            eliminatedKeys: JSON.stringify(eliminatedKeys),
            timeSpentMs: Number(timeSpentMs) || 0,
            answeredAt: new Date(),
          },
          create: {
            sessionId,
            questionId,
            selectedChoice: selectedChoice.toUpperCase(),
            isCorrect,
            isFlagged: Boolean(isFlagged),
            eliminatedKeys: JSON.stringify(eliminatedKeys),
            timeSpentMs: Number(timeSpentMs) || 0,
          },
        });
      }
    }

    // Prepare response with full distractor analysis
    const distractorMap: Record<string, string | null> = {};
    for (const ch of question.choices) {
      distractorMap[ch.choiceKey] = ch.distractorAnalysis;
    }

    return NextResponse.json({
      success: true,
      questionId,
      selectedChoice: selectedChoice.toUpperCase(),
      isCorrect,
      correctChoice: question.correctChoice,
      explanation: question.explanation,
      distractorAnalysis: distractorMap,
      citation: question.citation,
    });
  } catch (error) {
    console.error("Submit quiz answer API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi nộp câu trả lời." },
      { status: 500 }
    );
  }
}
