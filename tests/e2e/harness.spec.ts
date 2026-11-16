import { test, expect } from '../fixtures/auth.fixture';
import { SELECTORS } from '../helpers/test-selectors';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'passq-cma-production-secret-jwt-key-2026';

test.describe('Milestone E1: Playwright Test Harness Verification', () => {
  test('1. Verify real browser contexts, cookie extraction, and cryptographic JWT verification', async ({
    authenticatedPage,
    secondaryAuthenticatedPage,
    unauthenticatedPage,
    primaryUser,
    secondaryUser,
  }) => {
    // 1.1 Unauthenticated context must have no auth tokens
    const unauthCookies = await unauthenticatedPage.context().cookies();
    const unauthToken = unauthCookies.find((c) => c.name === 'token');
    expect(unauthToken).toBeUndefined();

    // 1.2 Primary authenticated page cookie extraction & cryptographic verification
    const authCookies = await authenticatedPage.context().cookies();
    const primaryToken = authCookies.find((c) => c.name === 'token');
    expect(primaryToken).toBeDefined();
    expect(primaryToken!.httpOnly).toBe(true);
    expect(primaryToken!.path).toBe('/');
    expect(primaryToken!.sameSite).toBe('Lax');

    const primaryPayload = jwt.verify(primaryToken!.value, JWT_SECRET) as any;
    expect(primaryPayload.userId).toBe(primaryUser.id);
    expect(primaryPayload.email).toBe(primaryUser.email);
    expect(primaryPayload.role).toBe(primaryUser.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
    expect(primaryPayload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // 1.3 Secondary authenticated page cookie extraction & cryptographic verification
    const secCookies = await secondaryAuthenticatedPage.context().cookies();
    const secondaryToken = secCookies.find((c) => c.name === 'token');
    expect(secondaryToken).toBeDefined();
    expect(secondaryToken!.value).not.toBe(primaryToken!.value);

    const secondaryPayload = jwt.verify(secondaryToken!.value, JWT_SECRET) as any;
    expect(secondaryPayload.userId).toBe(secondaryUser.id);
    expect(secondaryPayload.email).toBe(secondaryUser.email);

    // 1.4 Fixture data model verification
    expect(primaryUser.email).toBe('student@passq.test');
    expect(secondaryUser.email).toBe('isolated_student@passq.test');
  });

  test('2. Verify real browser page navigation with persistent auth cookie delivery', async ({
    authenticatedPage,
  }) => {
    // Navigate real browser to home page
    const response = await authenticatedPage.goto('/');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    // Verify main page elements are rendered in browser DOM
    await expect(authenticatedPage.locator('h1')).toContainText('CMA Part 2');
    await expect(
      authenticatedPage.getByText('PassQ CMA Part 2 Architecture Online')
    ).toBeVisible();

    // Verify cookie remains attached post-navigation
    const postNavCookies = await authenticatedPage.context().cookies();
    const postNavToken = postNavCookies.find((c) => c.name === 'token');
    expect(postNavToken).toBeDefined();
  });

  test('3. Verify browser context API request execution', async ({
    authenticatedPage,
  }) => {
    // Execute GET request through authenticated browser context
    const apiResponse = await authenticatedPage.request.get('/api/curriculum/sections');
    expect(apiResponse.status()).toBe(200);
    const body = await apiResponse.json();
    expect(body).toBeDefined();
    const sections = Array.isArray(body) ? body : body.sections;
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
  });

  test('4. Verify UI test selectors definition', async () => {
    expect(SELECTORS.auth.loginForm).toBe('[data-testid="login-form"]');
    expect(SELECTORS.layout.brandLogo).toBe('[data-testid="brand-logo"]');
    expect(SELECTORS.dashboard.countdownTimer).toBe('[data-testid="exam-countdown"]');
    expect(SELECTORS.roadmap.sectionTabs).toBe('[data-testid="section-tab"]');
    expect(SELECTORS.quiz.feedbackBanner).toBe('[data-testid="quiz-feedback-banner"]');
    expect(SELECTORS.srs.rating1Forget).toBe('[data-testid="srs-rating-1"], button:has-text("Quên")');
    expect(SELECTORS.exam.totalScoreDisplay).toBe('[data-testid="exam-total-score"]');
    expect(SELECTORS.formulas.latexFormula).toBe('[data-testid="latex-formula"], .katex');
  });
});
