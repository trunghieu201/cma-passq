import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');
    const sectionId = searchParams.get('sectionId');

    const whereClause: any = {};
    if (unitId) {
      whereClause.unitId = unitId;
    } else if (sectionId) {
      whereClause.unit = {
        sectionId: sectionId.toUpperCase(),
      };
    }

    const currentUser = await getCurrentUser(req);

    const subunits = await prisma.subunit.findMany({
      where: whereClause,
      orderBy: [
        { orderIndex: 'asc' },
        { subunitNum: 'asc' },
      ],
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
        ...(currentUser
          ? {
              userNodes: {
                where: {
                  userId: currentUser.id,
                },
                select: {
                  accuracyPct: true,
                  status: true,
                },
              },
            }
          : {}),
      },
    });

    const data = subunits.map((su: any) => {
      let masteryPct = 0.0;

      if (currentUser && su.userNodes && su.userNodes.length > 0) {
        masteryPct = Math.round(su.userNodes[0].accuracyPct || 0);
      }

      return {
        id: su.id,
        unitId: su.unitId,
        code: su.code,
        name: su.title,
        questionCount: su.totalCount || su._count.questions,
        masteryPct,
      };
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching curriculum subunits:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tải danh mục Subunit.' },
      { status: 500 }
    );
  }
}
