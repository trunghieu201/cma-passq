import { describe, it, expect, vi } from 'vitest';
import { GET as sectionsGET } from '@/app/api/curriculum/sections/route';
import { GET as unitsGET } from '@/app/api/curriculum/units/route';
import { GET as subunitsGET } from '@/app/api/curriculum/subunits/route';
import { createTestRequest } from '../helpers/test-request';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    section: { findMany: vi.fn() },
    unit: { findMany: vi.fn() },
    subunit: { findMany: vi.fn() },
  },
}));

describe('Curriculum API Endpoints', () => {
  it('GET /api/curriculum/sections trả về 6 Sections chuẩn CMA Part 2', async () => {
    (prisma.section.findMany as any).mockResolvedValue([
      { id: 'A', code: 'A', title: 'Financial Statement Analysis', weight: 20, _count: { units: 3, questions: 1882 }, units: [{ totalCount: 1882 }] },
      { id: 'B', code: 'B', title: 'Corporate Finance', weight: 20, _count: { units: 5, questions: 2137 }, units: [{ totalCount: 2137 }] },
      { id: 'C', code: 'C', title: 'Decision Analysis', weight: 25, _count: { units: 3, questions: 1774 }, units: [{ totalCount: 1774 }] },
      { id: 'D', code: 'D', title: 'Risk Management', weight: 10, _count: { units: 1, questions: 462 }, units: [{ totalCount: 462 }] },
      { id: 'E', code: 'E', title: 'Investment Decisions', weight: 10, _count: { units: 2, questions: 887 }, units: [{ totalCount: 887 }] },
      { id: 'F', code: 'F', title: 'Professional Ethics', weight: 15, _count: { units: 1, questions: 467 }, units: [{ totalCount: 467 }] },
    ]);

    const res = await sectionsGET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(6);
    expect(data[0]).toHaveProperty('id', 'A');
    expect(data[0]).toHaveProperty('name', 'Financial Statement Analysis');
    expect(data[0]).toHaveProperty('unitCount', 3);
    expect(data[0]).toHaveProperty('questionCount', 1882);
    expect(data[0]).toHaveProperty('weightPct', 20);
  });

  it('GET /api/curriculum/units hỗ trợ lọc theo ?sectionId=A', async () => {
    (prisma.unit.findMany as any).mockResolvedValue([
      { id: 'u1', sectionId: 'A', unitNumber: 1, title: 'Liquidity Ratios', totalCount: 1288, _count: { subunits: 4, questions: 1288 } },
      { id: 'u2', sectionId: 'A', unitNumber: 2, title: 'Profitability Ratios', totalCount: 364, _count: { subunits: 3, questions: 364 } },
      { id: 'u3', sectionId: 'A', unitNumber: 3, title: 'Activity Ratios', totalCount: 230, _count: { subunits: 2, questions: 230 } },
    ]);

    const req = createTestRequest('http://localhost:3000/api/curriculum/units?sectionId=A');
    const res = await unitsGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(3);
    expect(data[0].sectionId).toBe('A');
    expect(data[0].code).toBe('Unit 1');
    expect(data[0].name).toBe('Liquidity Ratios');
    expect(data[0].subunitCount).toBe(4);
    expect(data[0].questionCount).toBe(1288);
  });

  it('GET /api/curriculum/subunits trả về danh sách subunits và masteryPct', async () => {
    (prisma.subunit.findMany as any).mockResolvedValue([
      { id: '2.1.1', unitId: 'u1', code: '2.1.1', subunitNum: 1, title: 'Common-Size Financial Statements', totalCount: 320, _count: { questions: 320 }, userNodes: [] },
      { id: '2.1.2', unitId: 'u1', code: '2.1.2', subunitNum: 2, title: 'Liquidity and Solvency Ratios', totalCount: 450, _count: { questions: 450 }, userNodes: [] },
    ]);

    const req = createTestRequest('http://localhost:3000/api/curriculum/subunits?unitId=u1');
    const res = await subunitsGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(2);
    expect(data[0].id).toBe('2.1.1');
    expect(data[0].unitId).toBe('u1');
    expect(data[0].code).toBe('2.1.1');
    expect(data[0].name).toBe('Common-Size Financial Statements');
    expect(data[0].questionCount).toBe(320);
    expect(data[0].masteryPct).toBe(0);
  });
});
