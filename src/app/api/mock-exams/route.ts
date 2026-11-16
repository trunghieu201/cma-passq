import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);

    const mockExams = await prisma.mockExam.findMany({
      where: { part: 2 },
      orderBy: { id: "asc" },
      include: {
        _count: {
          select: { questions: true },
        },
        ...(currentUser
          ? {
              attempts: {
                where: { userId: currentUser.id },
                orderBy: { completedAt: "desc" },
                take: 1,
                select: {
                  id: true,
                  score: true,
                  scaledScore: true,
                  isPassed: true,
                  completedAt: true,
                  totalTimeSeconds: true,
                },
              },
            }
          : {}),
      },
    });

    const data = mockExams.map((m: any) => {
      const latestAttempt = m.attempts && m.attempts.length > 0 ? m.attempts[0] : null;

      return {
        id: m.id,
        name: m.name,
        part: m.part,
        questionCount: m.questionCount || m._count.questions,
        durationMinutes: m.durationMinutes,
        latestAttempt: latestAttempt
          ? {
              score: latestAttempt.score,
              scaledScore: latestAttempt.scaledScore,
              isPassed: latestAttempt.isPassed,
              completedAt: latestAttempt.completedAt,
              totalTimeSeconds: latestAttempt.totalTimeSeconds,
            }
          : null,
      };
    });

    return NextResponse.json({
      total: data.length,
      mockExams: data,
    });
  } catch (error) {
    console.error("Mock exams list API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách đề thi thử." },
      { status: 500 }
    );
  }
}
