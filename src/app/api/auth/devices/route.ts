import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để xem thông tin thiết bị." },
        { status: 401 }
      );
    }

    const sessions = await prisma.userSession.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      activeSessionsCount: Math.max(1, sessions.length),
      currentDevice: {
        type: "Desktop / Browser",
        name: "Trình duyệt hiện tại (Web App)",
        isCurrent: true,
        authType: "JWT HttpOnly Cookie",
      },
      otherSessions: sessions.filter((s) => s.expiresAt > new Date()),
    });
  } catch (error) {
    console.error("Device status API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi lấy thông tin phiên thiết bị." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để thu hồi phiên thiết bị." },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Allow empty body or fallback
    }

    // Revoke any secondary registered sessions for this user
    await prisma.userSession.deleteMany({
      where: { userId: currentUser.id },
    });

    return NextResponse.json({
      success: true,
      message: "Đã thu hồi tất cả các phiên đăng nhập khác ngoại trừ thiết bị này.",
    });
  } catch (error) {
    console.error("Revoke sessions API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi thu hồi phiên thiết bị khác." },
      { status: 500 }
    );
  }
}
