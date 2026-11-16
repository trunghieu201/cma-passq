import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const sectionId = searchParams.get("sectionId");
    const rawLimit = searchParams.get("limit");
    const limit = Math.min(100, Math.max(1, rawLimit ? parseInt(rawLimit, 10) : 50));

    const whereClause: any = { part: 2 };

    if (sectionId) {
      whereClause.sectionId = sectionId.toUpperCase();
    }

    if (query.trim()) {
      whereClause.OR = [
        { titleEn: { contains: query } },
        { titleVi: { contains: query } },
        { plainExpr: { contains: query } },
        { noteEn: { contains: query } },
        { noteVi: { contains: query } },
      ];
    }

    const total = await prisma.formula.count({ where: whereClause });
    const formulas = await prisma.formula.findMany({
      where: whereClause,
      take: limit,
      orderBy: [{ sectionId: "asc" }, { id: "asc" }],
      include: {
        section: {
          select: { code: true, title: true },
        },
        unit: {
          select: { unitNumber: true, title: true },
        },
      },
    });

    return NextResponse.json({
      formulas,
      total,
      query,
      limit,
    });
  } catch (error) {
    console.error("Formulas API error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách công thức." },
      { status: 500 }
    );
  }
}
