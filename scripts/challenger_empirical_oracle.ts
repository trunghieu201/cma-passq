/**
 * Independent Challenger Empirical Verification Oracle
 * Milestone E1 Iteration 2 Gate Verification
 */
import jwt from 'jsonwebtoken';
import {
  calculateExpectedSM2,
  calculateExpectedTMI,
  calculateExpectedIMAScore,
  SM2_STANDARD_INTERVALS,
  SM2State,
} from '../tests/helpers/srs-verifier';
import { createMockAuthCookie } from '../tests/fixtures/auth.fixture';
import { PRIMARY_TEST_USER, SECONDARY_TEST_USER } from '../tests/fixtures/mock-users';
import { verifyToken, extractTokenFromRequest } from '../src/lib/auth';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(suite: string, name: string, condition: boolean, message?: string) {
  results.push({ suite, name, passed: Boolean(condition), message });
  if (condition) {
    console.log(`[PASS] [${suite}] ${name}`);
  } else {
    console.error(`[FAIL] [${suite}] ${name} - ${message || 'Assertion failed'}`);
  }
}

console.log('================================================================');
console.log('EMPIRICAL CHALLENGER VERIFICATION HARNESS');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// SUITE 1: JWT Cryptographic Verification & Auth Fixture Security
// ----------------------------------------------------------------------
console.log('--- SUITE 1: JWT & Auth Fixture Cryptographic Tests ---');
const JWT_SECRET = process.env.JWT_SECRET || 'passq-cma-production-secret-jwt-key-2026';

{
  const primaryCookie = createMockAuthCookie(PRIMARY_TEST_USER, 'http://localhost:3000');
  const secondaryCookie = createMockAuthCookie(SECONDARY_TEST_USER, 'http://localhost:3000');

  // 1.1 Cookie attributes
  assert('Auth Fixture', 'Cookie name is "token"', primaryCookie.name === 'token');
  assert('Auth Fixture', 'Cookie is httpOnly', primaryCookie.httpOnly === true);
  assert('Auth Fixture', 'Cookie path is "/"', primaryCookie.path === '/');
  assert('Auth Fixture', 'Cookie sameSite is "Lax"', primaryCookie.sameSite === 'Lax');

  // 1.2 RFC 7519 structure (3-part dot-separated)
  const parts = primaryCookie.value.split('.');
  assert('Auth Fixture', 'JWT token has exactly 3 parts', parts.length === 3);

  // 1.3 Cryptographic signature verification with correct secret
  let decodedPrimary: any = null;
  try {
    decodedPrimary = jwt.verify(primaryCookie.value, JWT_SECRET);
    assert('Auth Fixture', 'Primary JWT verifies cleanly with correct secret', true);
  } catch (err: any) {
    assert('Auth Fixture', 'Primary JWT verifies cleanly with correct secret', false, err.message);
  }

  // 1.4 Payload integrity
  if (decodedPrimary) {
    assert('Auth Fixture', 'Primary JWT payload userId matches PRIMARY_TEST_USER.id', decodedPrimary.userId === PRIMARY_TEST_USER.id);
    assert('Auth Fixture', 'Primary JWT payload email matches PRIMARY_TEST_USER.email', decodedPrimary.email === PRIMARY_TEST_USER.email);
    assert('Auth Fixture', 'Primary JWT payload role is STUDENT', decodedPrimary.role === 'STUDENT');
    assert('Auth Fixture', 'Primary JWT expiration is set into future (~7 days)', decodedPrimary.exp > Math.floor(Date.now() / 1000) + 6 * 86400);
  }

  // 1.5 Secondary token cryptographic verification
  let decodedSecondary: any = null;
  try {
    decodedSecondary = jwt.verify(secondaryCookie.value, JWT_SECRET);
    assert('Auth Fixture', 'Secondary JWT verifies cleanly with correct secret', true);
  } catch (err: any) {
    assert('Auth Fixture', 'Secondary JWT verifies cleanly with correct secret', false, err.message);
  }

  if (decodedSecondary) {
    assert('Auth Fixture', 'Secondary userId matches SECONDARY_TEST_USER.id', decodedSecondary.userId === SECONDARY_TEST_USER.id);
    assert('Auth Fixture', 'Secondary email matches SECONDARY_TEST_USER.email', decodedSecondary.email === SECONDARY_TEST_USER.email);
    assert('Auth Fixture', 'Primary and secondary tokens are cryptographically distinct', primaryCookie.value !== secondaryCookie.value);
  }

  // 1.6 Adversarial Challenge: Tampered Signature Detection
  const tamperedToken = primaryCookie.value.substring(0, primaryCookie.value.length - 4) + 'abcd';
  let tamperedCaught = false;
  try {
    jwt.verify(tamperedToken, JWT_SECRET);
  } catch (err: any) {
    tamperedCaught = err.name === 'JsonWebTokenError';
  }
  assert('Auth Security', 'Tampered signature is rejected by jwt.verify', tamperedCaught);

  // 1.7 Adversarial Challenge: Wrong Secret Detection
  let wrongSecretCaught = false;
  try {
    jwt.verify(primaryCookie.value, 'wrong-bogus-secret-key-1234567890');
  } catch (err: any) {
    wrongSecretCaught = err.name === 'JsonWebTokenError';
  }
  assert('Auth Security', 'Token verification fails with incorrect secret', wrongSecretCaught);

  // 1.8 Adversarial Challenge: Expired Token Detection
  const expiredToken = jwt.sign(
    { userId: PRIMARY_TEST_USER.id, email: PRIMARY_TEST_USER.email, role: 'STUDENT' },
    JWT_SECRET,
    { expiresIn: '-1s' }
  );
  let expiredCaught = false;
  try {
    jwt.verify(expiredToken, JWT_SECRET);
  } catch (err: any) {
    expiredCaught = err.name === 'TokenExpiredError';
  }
  assert('Auth Security', 'Expired token throws TokenExpiredError', expiredCaught);

  // 1.9 Compatibility with backend verifyToken in src/lib/auth.ts
  const backendVerified = verifyToken(primaryCookie.value);
  assert('Backend Auth', 'src/lib/auth.ts:verifyToken successfully validates fixture cookie', backendVerified !== null && backendVerified.userId === PRIMARY_TEST_USER.id);

  // 1.10 Compatibility with extractTokenFromRequest via mock Request
  const mockReqWithCookie = new Request('http://localhost:3000/api/curriculum/sections', {
    headers: {
      cookie: `other=foo; token=${primaryCookie.value}; session=bar`,
    },
  });
  const extracted = extractTokenFromRequest(mockReqWithCookie);
  assert('Backend Auth', 'extractTokenFromRequest correctly extracts token from Cookie header', extracted === primaryCookie.value);

  const mockReqWithBearer = new Request('http://localhost:3000/api/curriculum/sections', {
    headers: {
      authorization: `Bearer ${primaryCookie.value}`,
    },
  });
  const extractedBearer = extractTokenFromRequest(mockReqWithBearer);
  assert('Backend Auth', 'extractTokenFromRequest correctly extracts token from Bearer header', extractedBearer === primaryCookie.value);
}

// ----------------------------------------------------------------------
// SUITE 2: SRS Verifier Mathematical Hardening & Monotonicity
// ----------------------------------------------------------------------
console.log('\n--- SUITE 2: SRS Verifier Mathematical Invariants ---');

// 2.1 Monotonicity stress across stages 0 to 10
{
  let allMonotonic = true;
  for (let stage = 0; stage <= 10; stage++) {
    const baseInterval = stage < SM2_STANDARD_INTERVALS.length ? SM2_STANDARD_INTERVALS[stage] : Math.round(90 * Math.pow(2.5, stage - 6));
    const state: SM2State = { stage, intervalDays: baseInterval, easeFactor: 2.5, lapses: 0, consecutiveCorrect: stage };

    const r1 = calculateExpectedSM2(state, 1);
    const r2 = calculateExpectedSM2(state, 2);
    const r3 = calculateExpectedSM2(state, 3);
    const r4 = calculateExpectedSM2(state, 4);

    // Rating 1 must reset to 1
    if (r1.nextIntervalDays !== 1) allMonotonic = false;
    // Rating 4 interval must be >= Rating 3 interval
    if (r4.nextIntervalDays < r3.nextIntervalDays) allMonotonic = false;
    // Rating 4 stage must be >= Rating 3 stage
    if (r4.nextStage < r3.nextStage) allMonotonic = false;
    // For stages > 0, r3 interval must be >= r2 interval
    if (stage > 1 && r3.nextIntervalDays < r2.nextIntervalDays) allMonotonic = false;
  }
  assert('SM-2 Monotonicity', 'Intervals monotonically increase with rating (Rating 1 <= 2 <= 3 <= 4) across stages 0-10', allMonotonic);
}

// 2.2 Deep stage progression: Stage 6, 7, 8, 9, 10 never shrink on Rating 4
{
  let noShrink = true;
  for (let stage = 6; stage <= 12; stage++) {
    const currentInterval = 90 * Math.pow(2, stage - 6);
    const state: SM2State = { stage, intervalDays: currentInterval, easeFactor: 2.5, lapses: 1, consecutiveCorrect: stage };
    const r4 = calculateExpectedSM2(state, 4);
    if (r4.nextIntervalDays <= currentInterval) {
      noShrink = false;
    }
  }
  assert('SM-2 Progression', 'Rating 4 strictly expands interval at all advanced stages (stages 6 through 12)', noShrink);
}

// 2.3 Comprehensive input sanitization & NaN protection for SM-2
{
  const validState: SM2State = { stage: 2, intervalDays: 3, easeFactor: 2.5, lapses: 0, consecutiveCorrect: 2 };
  let allRatingsResilient = true;
  for (const r of [0, 1, 2, 3, 4, 5, -1, 100, NaN, null, undefined] as any[]) {
    const res = calculateExpectedSM2(validState, r);
    if (
      Number.isNaN(res.nextStage) ||
      Number.isNaN(res.nextIntervalDays) ||
      Number.isNaN(res.nextEaseFactor) ||
      Number.isNaN(res.nextLapses) ||
      Number.isNaN(res.nextConsecutiveCorrect) ||
      Number.isNaN(res.nextDueDate.getTime()) ||
      res.nextEaseFactor < 1.3
    ) {
      allRatingsResilient = false;
    }
  }
  assert('SM-2 Robustness', 'SM-2 verifier handles all out-of-range and corrupt rating values (0, 5, -1, 100, NaN, null, undefined) without producing NaN', allRatingsResilient);

  // 2.3b Edge test: Corrupt current state object handling
  // If current.stage or current.intervalDays is NaN, does it recover via fallback or propagate?
  const corruptCurrent: any = { stage: NaN, intervalDays: NaN, easeFactor: NaN, lapses: NaN, consecutiveCorrect: NaN };
  const resCorrupt = calculateExpectedSM2(corruptCurrent, 1);
  assert('SM-2 Robustness', 'Corrupt state with Rating 1 resets cleanly (nextStage: 1, nextInterval: 1, EF: 1.96)', resCorrupt.nextStage === 1 && resCorrupt.nextIntervalDays === 1 && resCorrupt.nextEaseFactor === 1.96, `Actual: ${JSON.stringify(resCorrupt)}`);
}

// 2.4 Due date accuracy check
{
  const now = new Date('2026-11-16T12:00:00Z');
  const state: SM2State = { stage: 3, intervalDays: 7, easeFactor: 2.5, lapses: 0, consecutiveCorrect: 3 };
  const res = calculateExpectedSM2(state, 3, now);
  const diffMs = res.nextDueDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (86400 * 1000));
  assert('SM-2 Due Date', `nextDueDate is exactly ${res.nextIntervalDays} days ahead of baseDate`, diffDays === res.nextIntervalDays);
}

// ----------------------------------------------------------------------
// SUITE 3: TMI (Topic Mastery Index) Mathematical Hardening
// ----------------------------------------------------------------------
console.log('\n--- SUITE 3: TMI Mathematical Hardening ---');

// 3.1 Clamping & boundary invariants
{
  const testInputs = [
    { recentAccuracy: -1, coverage: -1, speedFactor: -1 },
    { recentAccuracy: 2.5, coverage: 10, speedFactor: 5 },
    { recentAccuracy: Infinity, coverage: Infinity, speedFactor: Infinity },
    { recentAccuracy: -Infinity, coverage: -Infinity, speedFactor: -Infinity },
    { recentAccuracy: NaN, coverage: NaN, speedFactor: NaN },
    { recentAccuracy: undefined as any, coverage: null as any, speedFactor: 'abc' as any },
  ];

  let tmiClamped = true;
  for (const inp of testInputs) {
    const res = calculateExpectedTMI(inp);
    if (res.tmi < 0 || res.tmi > 100 || Number.isNaN(res.tmi)) {
      tmiClamped = false;
    }
    if (!['Gold', 'Silver', 'Bronze', 'Novice'].includes(res.badge)) {
      tmiClamped = false;
    }
  }
  assert('TMI Invariant', 'TMI is guaranteed to remain clamped in [0, 100] with valid badge across extreme inputs', tmiClamped);
}

// 3.2 Badge partition continuity
{
  const b80 = calculateExpectedTMI({ recentAccuracy: 0.8, coverage: 0.8, speedFactor: 0.8 });
  const b799 = calculateExpectedTMI({ recentAccuracy: 0.799, coverage: 0.799, speedFactor: 0.799 });
  const b60 = calculateExpectedTMI({ recentAccuracy: 0.6, coverage: 0.6, speedFactor: 0.6 });
  const b599 = calculateExpectedTMI({ recentAccuracy: 0.599, coverage: 0.599, speedFactor: 0.599 });
  const b40 = calculateExpectedTMI({ recentAccuracy: 0.4, coverage: 0.4, speedFactor: 0.4 });
  const b399 = calculateExpectedTMI({ recentAccuracy: 0.399, coverage: 0.399, speedFactor: 0.399 });

  assert('TMI Partitions', 'TMI badge partitions are strictly: Gold >= 80, Silver [60,80), Bronze [40,60), Novice < 40',
    b80.badge === 'Gold' &&
    b799.badge === 'Silver' &&
    b60.badge === 'Silver' &&
    b599.badge === 'Bronze' &&
    b40.badge === 'Bronze' &&
    b399.badge === 'Novice'
  );
}

// ----------------------------------------------------------------------
// SUITE 4: IMA Scaled Scoring Hardening
// ----------------------------------------------------------------------
console.log('\n--- SUITE 4: IMA Scaled Scoring Hardening ---');

// 4.1 Weight conservation
{
  const weights = [0.15, 0.20, 0.20, 0.15, 0.15, 0.15];
  const weightSum = weights.reduce((acc, w) => acc + w, 0);
  assert('IMA Scoring', 'Section weights sum to exactly 1.0 (100%)', Math.abs(weightSum - 1.0) < 1e-9);

  // Scaling 0-500
  const minScore = calculateExpectedIMAScore({ sectionA: 0, sectionB: 0, sectionC: 0, sectionD: 0, sectionE: 0, sectionF: 0 });
  const maxScore = calculateExpectedIMAScore({ sectionA: 1, sectionB: 1, sectionC: 1, sectionD: 1, sectionE: 1, sectionF: 1 });
  assert('IMA Scoring', 'IMA scaledScore range is strictly 0 to 500', minScore.scaledScore === 0 && maxScore.scaledScore === 500);
}

// ----------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------
console.log('\n================================================================');
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
console.log(`ORACLE VERDICT: ${failed === 0 ? 'ALL PASSED' : 'FAILURES DETECTED'}`);
console.log(`Summary: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
