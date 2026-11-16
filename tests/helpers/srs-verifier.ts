/**
 * Spaced Repetition (SM-2), TMI Mastery, and Exam Scoring Verification Helpers
 * Reference: PROJECT.md § Learning & Scoring Engines, TEST_INFRA.md
 */

export const SM2_STANDARD_INTERVALS = [0, 1, 3, 7, 16, 35, 90];

export interface SM2State {
  stage: number;
  intervalDays: number;
  easeFactor: number;
  lapses: number;
  consecutiveCorrect: number;
}

export interface SM2CalculationResult {
  nextStage: number;
  nextIntervalDays: number;
  nextEaseFactor: number;
  nextLapses: number;
  nextConsecutiveCorrect: number;
  nextDueDate: Date;
}

/**
 * Calculates next SM-2 state based on PassQ's spaced repetition rules
 * Rating:
 * 1: "Quên" (Again / Forget) -> resets interval to 1 day, stage to 1, lapses + 1
 * 2: "Khó" (Hard) -> interval = max(1, floor(currentInterval * 1.2)), EF decreases
 * 3: "Được" (Good) -> progresses to next standard interval, EF updated
 * 4: "Không cần" (Easy) -> skips ahead with bonus multiplier, EF increases
 */
export function calculateExpectedSM2(
  current: SM2State,
  rating: 1 | 2 | 3 | 4,
  baseDate: Date = new Date()
): SM2CalculationResult {
  // Sanitize rating to avoid NaN or invalid quality lookup
  const safeRating: 1 | 2 | 3 | 4 =
    typeof rating !== 'number' || Number.isNaN(rating) || rating <= 1
      ? 1
      : rating >= 4
      ? 4
      : (Math.round(rating) as 1 | 2 | 3 | 4);

  let nextStage = typeof current?.stage === 'number' && !Number.isNaN(current.stage) ? current.stage : 0;
  let nextIntervalDays = typeof current?.intervalDays === 'number' && !Number.isNaN(current.intervalDays) ? current.intervalDays : 0;
  let nextEaseFactor = typeof current?.easeFactor === 'number' && !Number.isNaN(current.easeFactor) ? current.easeFactor : 2.5;
  let nextLapses = typeof current?.lapses === 'number' && !Number.isNaN(current.lapses) ? current.lapses : 0;
  let nextConsecutiveCorrect = typeof current?.consecutiveCorrect === 'number' && !Number.isNaN(current.consecutiveCorrect) ? current.consecutiveCorrect : 0;

  // Map 1-4 rating to SM-2 quality (q: 0-5)
  // 1 -> q=1, 2 -> q=3, 3 -> q=4, 4 -> q=5
  const qMap: Record<number, number> = { 1: 1, 2: 3, 3: 4, 4: 5 };
  const q = qMap[safeRating];

  // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  nextEaseFactor = nextEaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (Number.isNaN(nextEaseFactor) || nextEaseFactor < 1.3) nextEaseFactor = 1.3;
  // Round EF to 2 decimal places
  nextEaseFactor = Math.round(nextEaseFactor * 100) / 100;

  if (safeRating === 1) {
    // "Quên": Reset
    nextStage = 1;
    nextIntervalDays = 1;
    nextLapses = nextLapses + 1;
    nextConsecutiveCorrect = 0;
  } else if (safeRating === 2) {
    // "Khó": Modest increase or repeat current
    nextStage = Math.max(1, current.stage);
    nextIntervalDays = Math.max(1, Math.round(current.intervalDays * 1.2));
    nextConsecutiveCorrect = current.consecutiveCorrect + 1;
  } else if (safeRating === 3) {
    // "Được": Standard progression
    nextStage = current.stage + 1;
    if (nextStage < SM2_STANDARD_INTERVALS.length) {
      nextIntervalDays = SM2_STANDARD_INTERVALS[nextStage];
    } else {
      nextIntervalDays = Math.round(current.intervalDays * nextEaseFactor);
    }
    nextConsecutiveCorrect = current.consecutiveCorrect + 1;
  } else if (safeRating === 4) {
    // "Không cần": Accelerated progression (without clamping nextStage to SM2_STANDARD_INTERVALS.length - 1)
    nextStage = current.stage + 2;
    if (nextStage < SM2_STANDARD_INTERVALS.length) {
      nextIntervalDays = Math.round(SM2_STANDARD_INTERVALS[nextStage] * 1.3);
    } else {
      nextIntervalDays = Math.round(current.intervalDays * nextEaseFactor * 1.3);
    }
    nextConsecutiveCorrect = current.consecutiveCorrect + 1;
  }

  const nextDueDate = new Date(baseDate.getTime() + nextIntervalDays * 86400 * 1000);

  return {
    nextStage,
    nextIntervalDays,
    nextEaseFactor,
    nextLapses,
    nextConsecutiveCorrect,
    nextDueDate,
  };
}

/**
 * Calculates Topic Mastery Index (TMI): 0.55 * RecentAccuracy + 0.30 * Coverage + 0.15 * SpeedFactor
 * Output: clamped [0, 100] %
 */
export function calculateExpectedTMI(params: {
  recentAccuracy: number; // 0.0 - 1.0 (accuracy of last 20 attempts)
  coverage: number;       // 0.0 - 1.0 (proportion of subunit questions attempted)
  speedFactor: number;    // 0.0 - 1.0 (1.0 = pacing <= 1.8 min/question, decaying if slower)
}): { tmi: number; badge: 'Gold' | 'Silver' | 'Bronze' | 'Novice' } {
  const safeAccuracy = Number.isFinite(params?.recentAccuracy) ? Math.max(0, Math.min(1, params.recentAccuracy)) : 0;
  const safeCoverage = Number.isFinite(params?.coverage) ? Math.max(0, Math.min(1, params.coverage)) : 0;
  const safeSpeed = Number.isFinite(params?.speedFactor) ? Math.max(0, Math.min(1, params.speedFactor)) : 0;

  const rawTmi = (0.55 * safeAccuracy + 0.30 * safeCoverage + 0.15 * safeSpeed) * 100;
  const tmi = Math.max(0, Math.min(100, Math.round(rawTmi * 10) / 10));

  let badge: 'Gold' | 'Silver' | 'Bronze' | 'Novice' = 'Novice';
  if (tmi >= 80) badge = 'Gold';
  else if (tmi >= 60) badge = 'Silver';
  else if (tmi >= 40) badge = 'Bronze';

  return { tmi, badge };
}

/**
 * Calculates IMA Scaled Score (0-500 scale, passing threshold = 360)
 */
export function calculateExpectedIMAScore(sectionAccuracies: {
  sectionA: number; // 0.0 - 1.0 (weight 15%)
  sectionB: number; // 0.0 - 1.0 (weight 20%)
  sectionC: number; // 0.0 - 1.0 (weight 20%)
  sectionD: number; // 0.0 - 1.0 (weight 15%)
  sectionE: number; // 0.0 - 1.0 (weight 15%)
  sectionF: number; // 0.0 - 1.0 (weight 15%)
}): { scaledScore: number; isPassed: boolean; overallAccuracy: number } {
  const weights = {
    sectionA: 0.15,
    sectionB: 0.20,
    sectionC: 0.20,
    sectionD: 0.15,
    sectionE: 0.15,
    sectionF: 0.15,
  };

  const weightedAccuracy =
    sectionAccuracies.sectionA * weights.sectionA +
    sectionAccuracies.sectionB * weights.sectionB +
    sectionAccuracies.sectionC * weights.sectionC +
    sectionAccuracies.sectionD * weights.sectionD +
    sectionAccuracies.sectionE * weights.sectionE +
    sectionAccuracies.sectionF * weights.sectionF;

  // Scaled score between 0 and 500
  const scaledScore = Math.round(weightedAccuracy * 500);
  const isPassed = scaledScore >= 360;

  return {
    scaledScore,
    isPassed,
    overallAccuracy: Math.round(weightedAccuracy * 1000) / 10,
  };
}
