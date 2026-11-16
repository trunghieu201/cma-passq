/**
 * Adversarial Challenge Suite for Milestone E1
 * Tests:
 * 1. SM-2 algorithm edge cases & mathematical boundaries (srs-verifier.ts)
 * 2. TMI Mastery index edge cases & NaN protection
 * 3. IMA scaled scoring edge cases & passing threshold boundaries
 * 4. SQLite concurrency stress test (WAL mode vs concurrent writes)
 */
import {
  calculateExpectedSM2,
  calculateExpectedTMI,
  calculateExpectedIMAScore,
  SM2_STANDARD_INTERVALS,
  SM2State,
} from '../tests/helpers/srs-verifier';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  expected: any;
  actual: any;
  details?: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, expected: any, actual: any, details?: string) {
  results.push({ category, name, passed, expected, actual, details });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${status}] [${category}] ${name}`);
  if (!passed) {
    console.log(`       Expected: ${JSON.stringify(expected)}`);
    console.log(`       Actual:   ${JSON.stringify(actual)}`);
    if (details) console.log(`       Details:  ${details}`);
  }
}

// ==========================================
// 1. SM-2 Algorithmic Stress Testing
// ==========================================
console.log('\n--- 1. SM-2 Stress Testing ---');

// 1.1 Zero lapses
{
  const state: SM2State = { stage: 3, intervalDays: 7, easeFactor: 2.5, lapses: 0, consecutiveCorrect: 3 };
  const res = calculateExpectedSM2(state, 1);
  record(
    'SM-2 Lapses',
    'Zero lapses transitions to 1 lapse upon Forget (rating 1)',
    res.nextLapses === 1 && res.nextStage === 1 && res.nextIntervalDays === 1,
    { nextLapses: 1, nextStage: 1, nextIntervalDays: 1 },
    { nextLapses: res.nextLapses, nextStage: res.nextStage, nextIntervalDays: res.nextIntervalDays }
  );
}

// 1.2 Multiple lapses preservation
{
  const state: SM2State = { stage: 4, intervalDays: 16, easeFactor: 1.8, lapses: 5, consecutiveCorrect: 2 };
  const resRating1 = calculateExpectedSM2(state, 1);
  record(
    'SM-2 Lapses',
    'Rating 1 increments existing multiple lapses (5 -> 6)',
    resRating1.nextLapses === 6,
    6,
    resRating1.nextLapses
  );

  const resRating3 = calculateExpectedSM2(state, 3);
  record(
    'SM-2 Lapses',
    'Rating 3 preserves existing multiple lapses (5 -> 5)',
    resRating3.nextLapses === 5,
    5,
    resRating3.nextLapses
  );

  const resRating2 = calculateExpectedSM2(state, 2);
  record(
    'SM-2 Lapses',
    'Rating 2 preserves existing multiple lapses (5 -> 5)',
    resRating2.nextLapses === 5,
    5,
    resRating2.nextLapses
  );

  const resRating4 = calculateExpectedSM2(state, 4);
  record(
    'SM-2 Lapses',
    'Rating 4 preserves existing multiple lapses (5 -> 5)',
    resRating4.nextLapses === 5,
    5,
    resRating4.nextLapses
  );
}

// 1.3 Ease Factor clamped at 1.3 min
{
  const stateAtMin: SM2State = { stage: 2, intervalDays: 3, easeFactor: 1.3, lapses: 3, consecutiveCorrect: 1 };
  const res = calculateExpectedSM2(stateAtMin, 1);
  record(
    'SM-2 Ease Factor Clamping',
    'EF clamped at 1.3 when rating 1 would reduce it to 0.76',
    res.nextEaseFactor === 1.3,
    1.3,
    res.nextEaseFactor
  );

  // Sub-minimum starting EF
  const stateBelowMin: SM2State = { stage: 1, intervalDays: 1, easeFactor: 1.0, lapses: 5, consecutiveCorrect: 0 };
  const resBelow = calculateExpectedSM2(stateBelowMin, 1);
  record(
    'SM-2 Ease Factor Clamping',
    'Sub-minimum EF (1.0) clamped to 1.3 on rating 1',
    resBelow.nextEaseFactor === 1.3,
    1.3,
    resBelow.nextEaseFactor
  );

  // Negative starting EF
  const stateNegative: SM2State = { stage: 1, intervalDays: 1, easeFactor: -2.0, lapses: 10, consecutiveCorrect: 0 };
  const resNeg = calculateExpectedSM2(stateNegative, 1);
  record(
    'SM-2 Ease Factor Clamping',
    'Negative EF (-2.0) clamped to 1.3 on rating 1',
    resNeg.nextEaseFactor === 1.3,
    1.3,
    resNeg.nextEaseFactor
  );

  // Ten consecutive forget ratings never drops below 1.3
  let currentEf = 2.5;
  let allClamped = true;
  for (let i = 0; i < 10; i++) {
    const r = calculateExpectedSM2({ stage: 1, intervalDays: 1, easeFactor: currentEf, lapses: i, consecutiveCorrect: 0 }, 1);
    currentEf = r.nextEaseFactor;
    if (currentEf < 1.3) allClamped = false;
  }
  record(
    'SM-2 Ease Factor Clamping',
    '10 consecutive Rating 1 calls never drop EF below 1.3',
    allClamped && currentEf === 1.3,
    1.3,
    currentEf
  );
}

// 1.4 Rating 4 High Stage Progression Anomaly (Clamping bug analysis)
{
  // Test stage 6 (interval 90) with rating 3 vs rating 4
  const stateStage6: SM2State = { stage: 6, intervalDays: 90, easeFactor: 2.5, lapses: 0, consecutiveCorrect: 6 };
  const resGood = calculateExpectedSM2(stateStage6, 3); // "Được" (Good)
  const resEasy = calculateExpectedSM2(stateStage6, 4); // "Không cần" (Easy)

  // Good rating progresses past standard intervals: 90 * 2.5 = 225 days
  record(
    'SM-2 Interval Progression',
    'Rating 3 at Stage 6 transitions to Stage 7 with 225 days (90 * 2.5)',
    resGood.nextStage === 7 && resGood.nextIntervalDays === 225,
    { nextStage: 7, nextIntervalDays: 225 },
    { nextStage: resGood.nextStage, nextIntervalDays: resGood.nextIntervalDays }
  );

  // What does Rating 4 do at Stage 6?
  // In srs-verifier.ts: nextStage = Math.min(6+2, 6) = 6.
  // nextIntervalDays = Math.round(SM2_STANDARD_INTERVALS[6] * 1.3) = 117 days!
  // Answering "Easy" results in LESS days (117) than answering "Good" (225)!
  const isEasyGreaterThanGood = resEasy.nextIntervalDays >= resGood.nextIntervalDays;
  record(
    'SM-2 Interval Progression',
    'CRITICAL CHALLENGE: Rating 4 (Easy) interval should be >= Rating 3 (Good) interval at Stage 6',
    isEasyGreaterThanGood,
    `>= ${resGood.nextIntervalDays} (expected ~293 days: 90 * 2.5 * 1.3)`,
    resEasy.nextIntervalDays,
    `ANOMALY FOUND: In srs-verifier.ts line 77, nextStage is clamped to SM2_STANDARD_INTERVALS.length - 1 (6), which causes Rating 4 to evaluate nextStage < length (6 < 7), executing the standard array lookup (90 * 1.3 = 117 days) instead of multiplying by easeFactor! Answering Easy gives 117 days while Good gives 225 days!`
  );

  // At Stage 7 (e.g. interval 225), Rating 4 clamps stage back down to 6 and resets interval to 117 days!
  const stateStage7: SM2State = { stage: 7, intervalDays: 225, easeFactor: 2.5, lapses: 0, consecutiveCorrect: 7 };
  const resEasyAt7 = calculateExpectedSM2(stateStage7, 4);
  record(
    'SM-2 Interval Progression',
    'CRITICAL CHALLENGE: Rating 4 at Stage 7 should not regress interval from 225 to 117 days',
    resEasyAt7.nextIntervalDays > 225,
    '> 225 days',
    resEasyAt7.nextIntervalDays,
    `ANOMALY FOUND: At stage 7, Rating 4 sets nextStage = Math.min(7+2, 6) = 6, yielding nextIntervalDays = 117 days, shrinking interval by 48% on Easy!`
  );
}

// 1.5 Invalid / Out-of-bounds ratings
{
  const state: SM2State = { stage: 2, intervalDays: 3, easeFactor: 2.5, lapses: 0, consecutiveCorrect: 2 };
  
  // Rating 0
  const res0 = calculateExpectedSM2(state, 0 as any);
  record(
    'SM-2 Invalid Inputs',
    'Rating 0 should not produce NaN EaseFactor',
    !Number.isNaN(res0.nextEaseFactor),
    'Valid number or error',
    res0.nextEaseFactor,
    'Rating 0 maps to undefined q, causing (5 - undefined) = NaN for EaseFactor'
  );

  // Rating 5
  const res5 = calculateExpectedSM2(state, 5 as any);
  record(
    'SM-2 Invalid Inputs',
    'Rating 5 should not produce NaN EaseFactor',
    !Number.isNaN(res5.nextEaseFactor),
    'Valid number or error',
    res5.nextEaseFactor,
    'Rating 5 maps to undefined q, producing NaN EaseFactor'
  );

  // Rating -1
  const resNeg = calculateExpectedSM2(state, -1 as any);
  record(
    'SM-2 Invalid Inputs',
    'Negative rating should not produce NaN EaseFactor',
    !Number.isNaN(resNeg.nextEaseFactor),
    'Valid number or error',
    resNeg.nextEaseFactor,
    'Negative rating produces NaN EaseFactor'
  );
}

// ==========================================
// 2. TMI Mastery Stress Testing
// ==========================================
console.log('\n--- 2. TMI Stress Testing ---');

// 2.1 0 questions attempted (0 coverage, 0 accuracy, 0 speed)
{
  const res0 = calculateExpectedTMI({ recentAccuracy: 0, coverage: 0, speedFactor: 0 });
  record(
    'TMI Boundaries',
    '0 questions attempted produces TMI 0 and Novice badge',
    res0.tmi === 0 && res0.badge === 'Novice',
    { tmi: 0, badge: 'Novice' },
    res0
  );
}

// 2.2 100% across all factors
{
  const res100 = calculateExpectedTMI({ recentAccuracy: 1.0, coverage: 1.0, speedFactor: 1.0 });
  record(
    'TMI Boundaries',
    '100% performance produces TMI 100 and Gold badge',
    res100.tmi === 100 && res100.badge === 'Gold',
    { tmi: 100, badge: 'Gold' },
    res100
  );
}

// 2.3 Division by zero (NaN inputs from 0/0 attempts)
{
  const resNaN = calculateExpectedTMI({ recentAccuracy: 0 / 0, coverage: 0 / 0, speedFactor: 0 / 0 });
  record(
    'TMI Boundaries',
    'CHALLENGE: Division by zero (0/0 = NaN) should be handled gracefully without returning NaN TMI',
    !Number.isNaN(resNaN.tmi),
    '0 (or valid number)',
    resNaN.tmi,
    'Passing NaN into calculateExpectedTMI returns NaN instead of defaulting to 0'
  );
}

// 2.4 Badge threshold exact boundaries
{
  // 80.0 -> Gold
  // To get exactly 80: recentAccuracy: 0.8, coverage: 0.8, speedFactor: 0.8 -> (0.55*0.8 + 0.30*0.8 + 0.15*0.8) = 0.8 * 100 = 80
  const tmi80 = calculateExpectedTMI({ recentAccuracy: 0.8, coverage: 0.8, speedFactor: 0.8 });
  record(
    'TMI Thresholds',
    'TMI exactly 80.0 gets Gold badge',
    tmi80.tmi === 80 && tmi80.badge === 'Gold',
    { tmi: 80, badge: 'Gold' },
    tmi80
  );

  // 79.9 -> Silver
  // recentAccuracy: 0.799, coverage: 0.799, speedFactor: 0.799 -> 79.9
  const tmi79_9 = calculateExpectedTMI({ recentAccuracy: 0.799, coverage: 0.799, speedFactor: 0.799 });
  record(
    'TMI Thresholds',
    'TMI 79.9 gets Silver badge',
    tmi79_9.tmi === 79.9 && tmi79_9.badge === 'Silver',
    { tmi: 79.9, badge: 'Silver' },
    tmi79_9
  );

  // 60.0 -> Silver
  const tmi60 = calculateExpectedTMI({ recentAccuracy: 0.6, coverage: 0.6, speedFactor: 0.6 });
  record(
    'TMI Thresholds',
    'TMI exactly 60.0 gets Silver badge',
    tmi60.tmi === 60 && tmi60.badge === 'Silver',
    { tmi: 60, badge: 'Silver' },
    tmi60
  );

  // 59.9 -> Bronze
  const tmi59_9 = calculateExpectedTMI({ recentAccuracy: 0.599, coverage: 0.599, speedFactor: 0.599 });
  record(
    'TMI Thresholds',
    'TMI 59.9 gets Bronze badge',
    tmi59_9.tmi === 59.9 && tmi59_9.badge === 'Bronze',
    { tmi: 59.9, badge: 'Bronze' },
    tmi59_9
  );

  // 40.0 -> Bronze
  const tmi40 = calculateExpectedTMI({ recentAccuracy: 0.4, coverage: 0.4, speedFactor: 0.4 });
  record(
    'TMI Thresholds',
    'TMI exactly 40.0 gets Bronze badge',
    tmi40.tmi === 40 && tmi40.badge === 'Bronze',
    { tmi: 40, badge: 'Bronze' },
    tmi40
  );

  // 39.9 -> Novice
  const tmi39_9 = calculateExpectedTMI({ recentAccuracy: 0.399, coverage: 0.399, speedFactor: 0.399 });
  record(
    'TMI Thresholds',
    'TMI 39.9 gets Novice badge',
    tmi39_9.tmi === 39.9 && tmi39_9.badge === 'Novice',
    { tmi: 39.9, badge: 'Novice' },
    tmi39_9
  );
}

// 2.5 Mixed historical performance
{
  // High accuracy (95%) but low coverage (10%) and normal speed (80%)
  const mixed1 = calculateExpectedTMI({ recentAccuracy: 0.95, coverage: 0.10, speedFactor: 0.80 });
  // 0.55 * 0.95 + 0.30 * 0.10 + 0.15 * 0.80 = 0.5225 + 0.03 + 0.12 = 0.6725 -> 67.3 -> Silver
  record(
    'TMI Mixed Performance',
    'High accuracy (95%) with low coverage (10%) properly weights to Silver (67.3)',
    mixed1.tmi === 67.3 && mixed1.badge === 'Silver',
    { tmi: 67.3, badge: 'Silver' },
    mixed1
  );

  // Low accuracy (30%) but 100% coverage and high speed (100%)
  const mixed2 = calculateExpectedTMI({ recentAccuracy: 0.30, coverage: 1.0, speedFactor: 1.0 });
  // 0.55 * 0.30 + 0.30 * 1.0 + 0.15 * 1.0 = 0.165 + 0.30 + 0.15 = 0.615 -> 61.5 -> Silver
  record(
    'TMI Mixed Performance',
    'Low accuracy (30%) with full coverage and speed properly weights to Silver (61.5)',
    mixed2.tmi === 61.5 && mixed2.badge === 'Silver',
    { tmi: 61.5, badge: 'Silver' },
    mixed2
  );
}

// ==========================================
// 3. IMA Scaled Scoring Stress Testing
// ==========================================
console.log('\n--- 3. IMA Scaled Scoring Stress Testing ---');

// 3.1 0 correct out of 100
{
  const res0 = calculateExpectedIMAScore({
    sectionA: 0, sectionB: 0, sectionC: 0, sectionD: 0, sectionE: 0, sectionF: 0,
  });
  record(
    'IMA Scoring',
    '0 correct out of 100 yields 0 scaled score, isPassed: false, overallAccuracy: 0%',
    res0.scaledScore === 0 && res0.isPassed === false && res0.overallAccuracy === 0,
    { scaledScore: 0, isPassed: false, overallAccuracy: 0 },
    res0
  );
}

// 3.2 100 correct out of 100
{
  const res100 = calculateExpectedIMAScore({
    sectionA: 1.0, sectionB: 1.0, sectionC: 1.0, sectionD: 1.0, sectionE: 1.0, sectionF: 1.0,
  });
  record(
    'IMA Scoring',
    '100 correct out of 100 yields 500 scaled score, isPassed: true, overallAccuracy: 100%',
    res100.scaledScore === 500 && res100.isPassed === true && res100.overallAccuracy === 100,
    { scaledScore: 500, isPassed: true, overallAccuracy: 100 },
    res100
  );
}

// 3.3 Passing threshold boundaries (Passing = 360/500 = 72.0%)
{
  // Exactly 72.0% across all sections
  const resExactPass = calculateExpectedIMAScore({
    sectionA: 0.72, sectionB: 0.72, sectionC: 0.72, sectionD: 0.72, sectionE: 0.72, sectionF: 0.72,
  });
  record(
    'IMA Passing Threshold',
    'Exactly 72.0% yields scaledScore 360 and isPassed: true',
    resExactPass.scaledScore === 360 && resExactPass.isPassed === true,
    { scaledScore: 360, isPassed: true },
    resExactPass
  );

  // Rounding boundary: 71.9% -> 0.719 * 500 = 359.5 -> rounds to 360 -> isPassed: true
  const resRoundPass = calculateExpectedIMAScore({
    sectionA: 0.719, sectionB: 0.719, sectionC: 0.719, sectionD: 0.719, sectionE: 0.719, sectionF: 0.719,
  });
  record(
    'IMA Passing Threshold',
    '71.9% rounds to 360 and isPassed: true',
    resRoundPass.scaledScore === 360 && resRoundPass.isPassed === true,
    { scaledScore: 360, isPassed: true },
    resRoundPass
  );

  // Just below rounding boundary: 71.8% -> 0.718 * 500 = 359.0 -> 359 -> isPassed: false
  const resFail = calculateExpectedIMAScore({
    sectionA: 0.718, sectionB: 0.718, sectionC: 0.718, sectionD: 0.718, sectionE: 0.718, sectionF: 0.718,
  });
  record(
    'IMA Passing Threshold',
    '71.8% produces 359 and isPassed: false',
    resFail.scaledScore === 359 && resFail.isPassed === false,
    { scaledScore: 359, isPassed: false },
    resFail
  );

  // 71.88% -> 0.7188 * 500 = 359.4 -> rounds down to 359 -> isPassed: false
  const resFailClose = calculateExpectedIMAScore({
    sectionA: 0.7188, sectionB: 0.7188, sectionC: 0.7188, sectionD: 0.7188, sectionE: 0.7188, sectionF: 0.7188,
  });
  record(
    'IMA Passing Threshold',
    '71.88% (359.4) rounds down to 359 and isPassed: false',
    resFailClose.scaledScore === 359 && resFailClose.isPassed === false,
    { scaledScore: 359, isPassed: false },
    resFailClose
  );
}

// 3.4 Section Weight Asymmetry Stress Test
{
  // High in 15% sections (A, D, E, F: 60% total) but zero in 20% sections (B, C: 40% total)
  // Weighted: 0.15*1 + 0 + 0 + 0.15*1 + 0.15*1 + 0.15*1 = 0.60 -> 300
  const resWeight1 = calculateExpectedIMAScore({
    sectionA: 1.0, sectionB: 0, sectionC: 0, sectionD: 1.0, sectionE: 1.0, sectionF: 1.0,
  });
  record(
    'IMA Weighting',
    'Sections A, D, E, F at 100% (60% weight total) yields 300 score, failed',
    resWeight1.scaledScore === 300 && resWeight1.isPassed === false,
    { scaledScore: 300, isPassed: false },
    resWeight1
  );

  // High in 20% sections (B, C: 40% total) but zero in 15% sections
  // Weighted: 0.20*1 + 0.20*1 = 0.40 -> 200
  const resWeight2 = calculateExpectedIMAScore({
    sectionA: 0, sectionB: 1.0, sectionC: 1.0, sectionD: 0, sectionE: 0, sectionF: 0,
  });
  record(
    'IMA Weighting',
    'Sections B, C at 100% (40% weight total) yields 200 score, failed',
    resWeight2.scaledScore === 200 && resWeight2.isPassed === false,
    { scaledScore: 200, isPassed: false },
    resWeight2
  );
}

// ==========================================
// 4. SQLite Concurrency Stress Testing
// ==========================================
console.log('\n--- 4. SQLite Concurrency Stress Testing ---');

async function testSQLiteConcurrency() {
  const testDbPath = path.resolve(__dirname, '../tests/fixtures/concurrency_test.db');
  
  // Clean up any old test db
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal');
  if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm');

  // Test 4.1: Sequential transactions with single connection (simulating singleFork: true)
  const pySeqScript = `
import sqlite3
conn = sqlite3.connect(r'${testDbPath.replace(/\\/g, '\\\\')}')
conn.execute('PRAGMA journal_mode = WAL')
conn.execute('CREATE TABLE IF NOT EXISTS test_counter (id INTEGER PRIMARY KEY, value INTEGER NOT NULL)')
conn.execute('INSERT INTO test_counter (id, value) VALUES (1, 0)')
conn.commit()

for i in range(50):
    conn.execute('UPDATE test_counter SET value = value + 1 WHERE id = 1')
    conn.commit()

cur = conn.cursor()
cur.execute('SELECT value FROM test_counter WHERE id = 1')
val = cur.fetchone()[0]
conn.close()
print(f'VAL:{val}')
`;

  try {
    fs.writeFileSync(path.resolve(__dirname, 'seq_test.py'), pySeqScript);
    const out = execSync(`python "${path.resolve(__dirname, 'seq_test.py')}"`, { encoding: 'utf-8' });
    const match = out.match(/VAL:(\d+)/);
    const finalVal = match ? parseInt(match[1], 10) : 0;
    record(
      'SQLite Sequential Execution (singleFork)',
      '50 sequential transactions in single process succeed without database lock',
      finalVal === 50,
      50,
      finalVal
    );
    try { fs.unlinkSync(path.resolve(__dirname, 'seq_test.py')); } catch {}
  } catch (err: any) {
    record('SQLite Sequential Execution (singleFork)', 'Sequential transactions succeeded', false, 50, err.message);
  }

  // Test 4.2: Uncoordinated concurrent writers WITHOUT timeout (demonstrating why singleFork is required)
  const pyConcScript = `
import sqlite3
import threading
import time

db_path = r'${testDbPath.replace(/\\/g, '\\\\')}'
locked_errors = []

def worker1():
    try:
        conn = sqlite3.connect(db_path, timeout=0.0)
        conn.execute('BEGIN EXCLUSIVE TRANSACTION')
        conn.execute('UPDATE test_counter SET value = 999 WHERE id = 1')
        time.sleep(0.5)
        conn.commit()
        conn.close()
    except Exception as e:
        pass

def worker2():
    time.sleep(0.1) # let worker1 acquire lock
    try:
        conn = sqlite3.connect(db_path, timeout=0.0)
        conn.execute('BEGIN EXCLUSIVE TRANSACTION')
        conn.execute('UPDATE test_counter SET value = 888 WHERE id = 1')
        conn.commit()
        conn.close()
    except Exception as e:
        locked_errors.append(str(e))

t1 = threading.Thread(target=worker1)
t2 = threading.Thread(target=worker2)
t1.start()
t2.start()
t1.join()
t2.join()

if any('locked' in e or 'busy' in e for e in locked_errors):
    print('LOCKED:TRUE')
else:
    print(f'LOCKED:FALSE errors={locked_errors}')
`;

  try {
    fs.writeFileSync(path.resolve(__dirname, 'conc_test.py'), pyConcScript);
    const outConc = execSync(`python "${path.resolve(__dirname, 'conc_test.py')}"`, { encoding: 'utf-8' });
    const isLocked = outConc.includes('LOCKED:TRUE');
    record(
      'SQLite Locking Demonstration',
      'Concurrent uncoordinated SQLite writes trigger database is locked error',
      isLocked,
      true,
      isLocked,
      'Confirms that without singleFork / fileParallelism: false serialization, concurrent multi-process test runners encounter database locking'
    );
    try { fs.unlinkSync(path.resolve(__dirname, 'conc_test.py')); } catch {}
  } catch (err: any) {
    record('SQLite Locking Demonstration', 'Lock demonstration', false, true, err.message);
  }

  // Clean up
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal');
    if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm');
  } catch {}
}

testSQLiteConcurrency().then(() => {
  console.log('\n==========================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`SUMMARY: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('==========================================');
});
