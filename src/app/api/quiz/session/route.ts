import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để bắt đầu phiên luyện tập." },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const { mode = "PRACTICE", title = "Luyện tập câu hỏi", totalQuestions = 10, filterScope, timeLimitSec } = body;

    const session = await prisma.quizSession.create({
      data: {
        userId: currentUser.id,
        mode,
        title,
        totalQuestions: Number(totalQuestions) || 10,
        filterScope: filterScope ? JSON.stringify(filterScope) : null,
        timeLimitSec: timeLimitSec ? Number(timeLimitSec) : null,
        status: "IN_PROGRESS",
      },
    });

    return NextResponse.json(
      {
        success: true,
        sessionId: session.id,
        mode: session.mode,
        title: session.title,
        totalQuestions: session.totalQuestions,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create quiz session API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi khởi tạo phiên làm bài." },
      { status: 500 }
    );
  }
}
