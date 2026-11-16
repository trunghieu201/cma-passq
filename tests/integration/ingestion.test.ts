import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/db';

describe('Real Ingested Database Verification via Prisma', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('xác minh 6 Sections và tổng tỷ trọng 100%', async () => {
    const sections = await prisma.section.findMany({ orderBy: { orderIndex: 'asc' } });
    expect(sections.length).toBe(6);
    const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('xác minh 15 Units', async () => {
    const count = await prisma.unit.count();
    expect(count).toBe(15);
  });

  it('xác minh 57 Subunits', async () => {
    const count = await prisma.subunit.count();
    expect(count).toBe(57);
  });

  it('xác minh 222 Categories', async () => {
    const count = await prisma.category.count();
    expect(count).toBe(222);
  });

  it('xác minh 7,609 Questions Part 2', async () => {
    const count = await prisma.question.count();
    expect(count).toBe(7609);

    const nonPart2 = await prisma.question.count({ where: { part: { not: 2 } } });
    expect(nonPart2).toBe(0);
  });

  it('xác minh 30,436 Choices với đúng 1 đáp án đúng mỗi câu', async () => {
    const count = await prisma.choice.count();
    expect(count).toBe(30436);

    const correctCount = await prisma.choice.count({ where: { isCorrect: true } });
    expect(correctCount).toBe(7609);
  });

  it('xác minh distractor analyses được gắn vào các phương án sai', async () => {
    const withDistractor = await prisma.choice.count({
      where: { distractorAnalysis: { not: null } },
    });
    expect(withDistractor).toBeGreaterThanOrEqual(13150);

    const correctWithDistractor = await prisma.choice.count({
      where: {
        isCorrect: true,
        distractorAnalysis: { not: null },
      },
    });
    expect(correctWithDistractor).toBe(0);
  });

  it('xác minh 31 Mock Exams với 3,100 câu hỏi (100 câu/đề)', async () => {
    const mockCount = await prisma.mockExam.count();
    expect(mockCount).toBe(31);

    const mockQCount = await prisma.mockExamQuestion.count();
    expect(mockQCount).toBe(3100);
  });

  it('xác minh 109 CBQ Cases và 581 Items', async () => {
    const cases = await prisma.cbqCase.count();
    expect(cases).toBe(109);

    const items = await prisma.cbqItem.count();
    expect(items).toBe(581);
  });

  it('xác minh 302 Formulas (85 Cheat Sheet + 217 Library)', async () => {
    const sheets = await prisma.formula.count({ where: { isCheatSheet: true } });
    expect(sheets).toBe(85);

    const libs = await prisma.formula.count({ where: { isLibrary: true } });
    expect(libs).toBe(217);

    const total = await prisma.formula.count();
    expect(total).toBe(302);
  });
});
