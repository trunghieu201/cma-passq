import { describe, it, expect } from 'vitest';
import {
  calculateExpectedSM2,
  calculateExpectedTMI,
  calculateExpectedIMAScore,
  SM2_STANDARD_INTERVALS,
} from '../helpers/srs-verifier';
import { PRIMARY_TEST_USER, SECONDARY_TEST_USER } from '../fixtures/mock-users';
import { inMemoryDb, seedDueReviewCard } from '../fixtures/test-db';
import { apiClient } from '../fixtures/api-client';
import { SELECTORS } from '../helpers/test-selectors';

describe('Milestone E1: Test Harness & Fixtures Verification', () => {
  it('should verify test environment variables are loaded', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.BASE_URL).toBeDefined();
  });

  it('should verify mock users fixture integrity', () => {
    expect(PRIMARY_TEST_USER.email).toBe('student@passq.test');
    expect(PRIMARY_TEST_USER.plan?.targetScore).toBe(420);
    expect(SECONDARY_TEST_USER.email).toBe('isolated_student@passq.test');
    expect(SECONDARY_TEST_USER.plan?.mode).toBe('fast-track');
  });

  it('should verify UI test selectors structure', () => {
    expect(SELECTORS.auth.loginForm).toBeDefined();
    expect(SELECTORS.layout.navDashboard).toBeDefined();
    expect(SELECTORS.quiz.optionA).toBeDefined();
    expect(SELECTORS.srs.rating1Forget).toBeDefined();
    expect(SELECTORS.exam.scorecard).toBeDefined();
  });

  it('should verify SM-2 calculation helper for rating 1 (Quên)', () => {
    const current = {
      stage: 3,
      intervalDays: 7,
      easeFactor: 2.5,
      lapses: 0,
      consecutiveCorrect: 3,
    };
    const result = calculateExpectedSM2(current, 1);
    expect(result.nextStage).toBe(1);
    expect(result.nextIntervalDays).toBe(1);
    expect(result.nextLapses).toBe(1);
    expect(result.nextConsecutiveCorrect).toBe(0);
  });

  it('should verify SM-2 calculation helper for rating 3 (Được)', () => {
    const current = {
      stage: 2,
      intervalDays: 3,
      easeFactor: 2.5,
      lapses: 0,
      consecutiveCorrect: 2,
    };
    const result = calculateExpectedSM2(current, 3);
    expect(result.nextStage).toBe(3);
    expect(result.nextIntervalDays).toBe(SM2_STANDARD_INTERVALS[3]); // 7 days
    expect(result.nextConsecutiveCorrect).toBe(3);
  });

  it('should verify TMI calculation helper', () => {
    const result = calculateExpectedTMI({
      recentAccuracy: 0.85,
      coverage: 0.80,
      speedFactor: 1.0,
    });
    // 0.55 * 85 + 0.30 * 80 + 0.15 * 100 = 46.75 + 24.0 + 15.0 = 85.75 -> 85.8%
    expect(result.tmi).toBe(85.8);
    expect(result.badge).toBe('Gold');
  });

  it('should verify IMA scaled score calculation helper', () => {
    const result = calculateExpectedIMAScore({
      sectionA: 0.80,
      sectionB: 0.75,
      sectionC: 0.70,
      sectionD: 0.85,
      sectionE: 0.90,
      sectionF: 0.80,
    });
    // 0.80*0.15 + 0.75*0.20 + 0.70*0.20 + 0.85*0.15 + 0.90*0.15 + 0.80*0.15
    // = 0.12 + 0.15 + 0.14 + 0.1275 + 0.135 + 0.12 = 0.7925
    // 0.7925 * 500 = 396.25 -> 396
    expect(result.scaledScore).toBe(396);
    expect(result.isPassed).toBe(true);
  });

  it('should verify test database helper seeds due review card', async () => {
    inMemoryDb.reset();
    const card = await seedDueReviewCard(PRIMARY_TEST_USER.id, 'q-test-101', 2, 3);
    expect(card.id).toBe(`card-${PRIMARY_TEST_USER.id}-q-test-101`);
    expect(card.intervalDays).toBe(3);
    expect(inMemoryDb.reviewCards.has(card.id)).toBe(true);
  });

  it('should verify API client structure', () => {
    expect(apiClient.auth.login).toBeInstanceOf(Function);
    expect(apiClient.quiz.submitAnswer).toBeInstanceOf(Function);
    expect(apiClient.srs.reviewCard).toBeInstanceOf(Function);
    expect(apiClient.exam.submitExam).toBeInstanceOf(Function);
  });
});
