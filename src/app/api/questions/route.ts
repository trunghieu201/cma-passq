import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subunitId = searchParams.get("subunitId") || searchParams.get("subunit");
    const unitId = searchParams.get("unitId") || searchParams.get("unit");
    const sectionId = searchParams.get("sectionId") || searchParams.get("section");
    const mode = searchParams.get("mode") || "practice";
    const rawLimit = searchParams.get("limit");
    const limit = Math.min(50, Math.max(1, rawLimit ? parseInt(rawLimit, 10) : 10));

    const currentUser = await getCurrentUser(req);

    let whereClause: any = { part: 2 };

    if (mode === "weakness") {
      if (!currentUser) {
        return NextResponse.json(
          { error: "Vui lòng đăng nhập để ôn tập câu sai (điểm yếu)." },
          { status: 401 }
        );
      }

      // Find question IDs where user has lapses or lastResult is false
      const weaknessReviews = await prisma.userQuestionReview.findMany({
        where: {
          userId: currentUser.id,
          OR: [{ lapses: { gt: 0 } }, { lastResult: false }],
        },
        select: { questionId: true },
        take: limit * 2,
      });

      const questionIds = weaknessReviews.map((r) => r.questionId);

      if (questionIds.length > 0) {
        whereClause.id = { in: questionIds };
      } else {
        // Fallback: If no lapses, return standard questions
        if (subunitId) whereClause.subunitId = subunitId;
        else if (unitId) whereClause.unitId = unitId;
        else if (sectionId) whereClause.sectionId = sectionId.toUpperCase();
      }
    } else if (mode === "bookmarked") {
      if (!currentUser) {
        return NextResponse.json(
          { error: "Vui lòng đăng nhập để xem danh sách câu hỏi đã lưu." },
          { status: 401 }
        );
      }

      const bookmarks = await prisma.userBookmark.findMany({
        where: { userId: currentUser.id },
        select: { questionId: true },
        take: limit,
      });

      const questionIds = bookmarks.map((b) => b.questionId);
      if (questionIds.length === 0) {
        return NextResponse.json({
          questions: [],
          total: 0,
          mode: "bookmarked",
        });
      }
      whereClause.id = { in: questionIds };
    } else {
      // Standard practice mode
      if (subunitId) {
        whereClause.subunitId = subunitId;
      } else if (unitId) {
        whereClause.unitId = unitId;
      } else if (sectionId) {
        whereClause.sectionId = sectionId.toUpperCase();
      }
    }

    const totalMatching = await prisma.question.count({ where: whereClause });

    // Fetch questions with choices
    const questions = await prisma.question.findMany({
      where: whereClause,
      take: limit,
      orderBy: { sequenceNum: "asc" },
      include: {
        choices: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            choiceKey: true,
            content: true,
            isCorrect: true,
            distractorAnalysis: true,
            orderIndex: true,
          },
        },
        subunit: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            title: true,
          },
        },
        section: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    const formatted = questions.map((q) => ({
      id: q.id,
      stem: q.stem,
      basisScenario: q.basisScenario,
      correctChoice: q.correctChoice,
      explanation: q.explanation,
      citation: q.citation,
      questionType: q.questionType,
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
    }));

    return NextResponse.json({
      questions: formatted,
      total: totalMatching,
      limit,
      mode,
    });
  } catch (error) {
    console.error("Questions API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách câu hỏi." },
      { status: 500 }
    );
  }
}
