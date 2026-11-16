import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    const userId = currentUser?.id;

    // Fetch user progress nodes if logged in
    const userNodes = userId
      ? await prisma.userNodeProgress.findMany({
          where: { userId },
          select: {
            subunitId: true,
            status: true,
            stars: true,
            accuracyPct: true,
            attemptsCount: true,
          },
        })
      : [];

    const userNodeMap = new Map(userNodes.map((n) => [n.subunitId, n]));

    // Fetch Sections -> Units -> Subunits
    const sections = await prisma.section.findMany({
      where: { part: 2 },
      orderBy: { orderIndex: "asc" },
      include: {
        units: {
          orderBy: { unitNumber: "asc" },
          include: {
            subunits: {
              orderBy: [{ orderIndex: "asc" }, { subunitNum: "asc" }],
              include: {
                _count: {
                  select: { questions: true },
                },
                categories: {
                  orderBy: { orderIndex: "asc" },
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
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

    const curriculum = sections.map((sec) => {
      let sectionTotalQuestions = 0;
      let sectionCompletedCount = 0;

      const units = sec.units.map((unit) => {
        let unitTotalQuestions = 0;
        let unitCompletedCount = 0;

        const subunits = unit.subunits.map((su) => {
          const qCount = su.totalCount || su._count.questions;
          unitTotalQuestions += qCount;
          sectionTotalQuestions += qCount;

          const progress = userNodeMap.get(su.id);
          const status = progress?.status || "locked";
          const stars = progress?.stars || 0;
          const accuracyPct = Math.round(progress?.accuracyPct || 0);
          const attemptsCount = progress?.attemptsCount || 0;

          if (status === "completed" || status === "mastered") {
            unitCompletedCount++;
            sectionCompletedCount++;
          }

          return {
            id: su.id,
            code: su.code,
            subunitNum: su.subunitNum,
            title: su.title,
            questionCount: qCount,
            status,
            stars,
            accuracyPct,
            attemptsCount,
            categories: su.categories,
          };
        });

        return {
          id: unit.id,
          sectionId: unit.sectionId,
          unitNumber: unit.unitNumber,
          code: `Unit ${unit.unitNumber}`,
          title: unit.title,
          questionCount: unitTotalQuestions || unit._count.questions,
          completedSubunits: unitCompletedCount,
          totalSubunits: subunits.length,
          subunits,
        };
      });

      return {
        id: sec.id,
        code: sec.code,
        title: sec.title,
        weight: sec.weight,
        orderIndex: sec.orderIndex,
        description: sec.description,
        totalQuestions: sectionTotalQuestions || sec._count.questions,
        totalUnits: units.length,
        completedSubunits: sectionCompletedCount,
        units,
      };
    });

    return NextResponse.json(
      {
        part: 2,
        title: "CMA Part 2: Strategic Financial Management",
        sections: curriculum,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Curriculum tree API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải cấu trúc lộ trình môn học." },
      { status: 500 }
    );
  }
}
