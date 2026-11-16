import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
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
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Dữ liệu gửi lên không đúng định dạng JSON." },
        { status: 400 }
      );
    }
    const { examDate, weeklyHours, targetScore, studyMode, mode } = body;

    const updateData: Record<string, any> = {};

    // Validate examDate
    if (examDate !== undefined) {
      if (typeof examDate !== "string" || !examDate.trim()) {
        return NextResponse.json(
          { error: "Ngày thi không hợp lệ." },
          { status: 400 }
        );
      }
      const parsedDate = new Date(examDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Ngày thi không đúng định dạng." },
          { status: 400 }
        );
      }
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (parsedDate < now) {
        return NextResponse.json(
          { error: "Ngày thi không được ở trong quá khứ." },
          { status: 400 }
        );
      }
      updateData.targetExamDate = parsedDate;
    }

    // Validate weeklyHours (1 to 60)
    if (weeklyHours !== undefined) {
      const hours = Number(weeklyHours);
      if (isNaN(hours) || hours < 1 || hours > 60) {
        return NextResponse.json(
          { error: "Số giờ học mỗi tuần phải từ 1 đến 60 giờ." },
          { status: 400 }
        );
      }
      updateData.weeklyHours = Math.round(hours);
    }

    // Validate targetScore (360 to 500)
    if (targetScore !== undefined) {
      const score = Number(targetScore);
      if (isNaN(score) || score < 360 || score > 500) {
        return NextResponse.json(
          { error: "Điểm mục tiêu CMA phải nằm trong khoảng 360 đến 500 điểm." },
          { status: 400 }
        );
      }
      updateData.targetScore = Math.round(score);
    }

    // Validate studyMode (supports 'mode' or 'studyMode', standard or fast_track / fast-track)
    const rawMode = studyMode || mode;
    if (rawMode !== undefined) {
      const normalizedMode =
        rawMode === "fast-track" || rawMode === "fast_track"
          ? "fast_track"
          : rawMode === "standard"
          ? "standard"
          : null;

      if (!normalizedMode) {
        return NextResponse.json(
          { error: "Chế độ học không hợp lệ (standard hoặc fast_track)." },
          { status: 400 }
        );
      }
      updateData.studyMode = normalizedMode;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        targetExamDate: true,
        weeklyHours: true,
        targetScore: true,
        studyMode: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật kế hoạch học tập thành công.",
      plan: {
        targetExamDate: updatedUser.targetExamDate,
        weeklyHours: updatedUser.weeklyHours,
        targetScore: updatedUser.targetScore,
        studyMode: updatedUser.studyMode,
      },
    });
  } catch (error) {
    console.error("Plan update API error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi cập nhật kế hoạch học tập." },
      { status: 500 }
    );
  }
}
