import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để xem các câu hỏi đã lưu." },
        { status: 401 }
      );
    }

    const bookmarks = await prisma.userBookmark.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
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
    });

    return NextResponse.json({
      total: bookmarks.length,
      bookmarks: bookmarks.map((b) => ({
        id: b.id,
        createdAt: b.createdAt,
        question: {
          id: b.question.id,
          stem: b.question.stem,
          correctChoice: b.question.correctChoice,
          explanation: b.question.explanation,
          citation: b.question.citation,
          subunit: b.question.subunit,
          unit: b.question.unit,
          section: b.question.section,
          choices: b.question.choices,
        },
      })),
    });
  } catch (error) {
    console.error("Bookmarks GET API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách câu hỏi đã lưu." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để lưu câu hỏi." },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
    }
    const { questionId } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: "Thiếu questionId." },
        { status: 400 }
      );
    }

    const existing = await prisma.userBookmark.findUnique({
      where: {
        userId_questionId: {
          userId: currentUser.id,
          questionId,
        },
      },
    });

    if (existing) {
      // Toggle off / remove
      await prisma.userBookmark.delete({
        where: { id: existing.id },
      });

      return NextResponse.json({
        bookmarked: false,
        message: "Đã hủy lưu câu hỏi.",
      });
    } else {
      // Add bookmark
      await prisma.userBookmark.create({
        data: {
          userId: currentUser.id,
          questionId,
        },
      });

      return NextResponse.json({
        bookmarked: true,
        message: "Đã lưu câu hỏi thành công.",
      });
    }
  } catch (error) {
    console.error("Bookmarks POST API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi cập nhật bookmark." },
      { status: 500 }
    );
  }
}
