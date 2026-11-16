import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subunitId = params.id;
    if (!subunitId) {
      return NextResponse.json(
        { error: "Subunit ID không hợp lệ." },
        { status: 400 }
      );
    }

    const subunit = await prisma.subunit.findUnique({
      where: { id: subunitId },
      include: {
        unit: {
          include: {
            section: true,
          },
        },
        categories: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            formulaHint: true,
            _count: {
              select: { questions: true },
            },
          },
        },
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!subunit) {
      return NextResponse.json(
        { error: "Không tìm thấy chương học (Subunit)." },
        { status: 404 }
      );
    }

    const currentUser = await getCurrentUser(req);
    let progress = null;

    if (currentUser) {
      progress = await prisma.userNodeProgress.findUnique({
        where: {
          userId_subunitId: {
            userId: currentUser.id,
            subunitId: subunit.id,
          },
        },
      });
    }

    return NextResponse.json({
      id: subunit.id,
      code: subunit.code,
      subunitNum: subunit.subunitNum,
      title: subunit.title,
      totalQuestions: subunit.totalCount || subunit._count.questions,
      unit: {
        id: subunit.unit.id,
        number: subunit.unit.unitNumber,
        title: subunit.unit.title,
      },
      section: {
        id: subunit.unit.section.id,
        code: subunit.unit.section.code,
        title: subunit.unit.section.title,
        weight: subunit.unit.section.weight,
      },
      categories: subunit.categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        formulaHint: c.formulaHint,
        questionCount: c._count.questions,
      })),
      progress: progress
        ? {
            status: progress.status,
            stars: progress.stars,
            accuracyPct: Math.round(progress.accuracyPct),
            attemptsCount: progress.attemptsCount,
            masteryScore: progress.masteryScore,
          }
        : {
            status: "locked",
            stars: 0,
            accuracyPct: 0,
            attemptsCount: 0,
            masteryScore: 0,
          },
    });
  } catch (error) {
    console.error("Subunit detail API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải thông tin Subunit." },
      { status: 500 }
    );
  }
}
