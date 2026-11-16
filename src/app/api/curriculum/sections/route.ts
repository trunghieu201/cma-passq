import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sections = await prisma.section.findMany({
      where: { part: 2 },
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: {
          select: {
            units: true,
            questions: true,
          },
        },
        units: {
          select: {
            totalCount: true,
          },
        },
      },
    });

    const data = sections.map((sec) => {
      const questionCount =
        sec._count.questions > 0
          ? sec._count.questions
          : sec.units.reduce((sum, u) => sum + (u.totalCount || 0), 0);

      return {
        id: sec.id,
        code: sec.code || sec.id,
        name: sec.title,
        unitCount: sec._count.units,
        questionCount,
        weightPct: sec.weight,
      };
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching curriculum sections:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tải danh mục Section.' },
      { status: 500 }
    );
  }
}
