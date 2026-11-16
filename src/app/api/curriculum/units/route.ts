import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId');

    const whereClause: any = {};
    if (sectionId) {
      whereClause.sectionId = sectionId.toUpperCase();
    }

    const units = await prisma.unit.findMany({
      where: whereClause,
      orderBy: [
        { sectionId: 'asc' },
        { unitNumber: 'asc' },
      ],
      include: {
        _count: {
          select: {
            subunits: true,
            questions: true,
          },
        },
      },
    });

    const data = units.map((u) => ({
      id: u.id,
      sectionId: u.sectionId,
      code: `Unit ${u.unitNumber}`,
      name: u.title,
      subunitCount: u._count.subunits,
      questionCount: u.totalCount || u._count.questions,
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching curriculum units:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tải danh mục Unit.' },
      { status: 500 }
    );
  }
}
