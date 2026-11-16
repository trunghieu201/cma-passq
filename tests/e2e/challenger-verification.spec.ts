import { test, expect } from '../fixtures/auth.fixture';
import { PRIMARY_TEST_USER, SECONDARY_TEST_USER } from '../fixtures/mock-users';

test.describe('Adversarial Verification: Fixture Isolation & Viewport Resilience', () => {
  test('1. Verify fixture isolation: cookies do not leak between contexts', async ({
    authenticatedPage,
    secondaryAuthenticatedPage,
    unauthenticatedPage,
  }) => {
    // 1.1 Check unauthenticated page cookies
    const unauthCookies = await unauthenticatedPage.context().cookies();
    expect(unauthCookies).toEqual([]);

    // 1.2 Check authenticated page cookies
    const authCookies = await authenticatedPage.context().cookies();
    expect(authCookies.length).toBeGreaterThanOrEqual(1);
    const primaryTokenCookie = authCookies.find((c) => c.name === 'token');
    expect(primaryTokenCookie).toBeDefined();
    const primaryPayload = JSON.parse(
      Buffer.from(primaryTokenCookie!.value.split('.')[1], 'base64').toString('utf-8')
    );
    expect(primaryPayload.email).toBe(PRIMARY_TEST_USER.email);
    expect(primaryPayload.userId).toBe(PRIMARY_TEST_USER.id);

    // 1.3 Check secondary authenticated page cookies
    const secondaryCookies = await secondaryAuthenticatedPage.context().cookies();
    expect(secondaryCookies.length).toBeGreaterThanOrEqual(1);
    const secondaryTokenCookie = secondaryCookies.find((c) => c.name === 'token');
    expect(secondaryTokenCookie).toBeDefined();
    const secondaryPayload = JSON.parse(
      Buffer.from(secondaryTokenCookie!.value.split('.')[1], 'base64').toString('utf-8')
    );
    expect(secondaryPayload.email).toBe(SECONDARY_TEST_USER.email);
    expect(secondaryPayload.userId).toBe(SECONDARY_TEST_USER.id);

    // 1.4 Verify token values are strictly distinct between primary and secondary
    expect(primaryTokenCookie!.value).not.toBe(secondaryTokenCookie!.value);

    // 1.5 Adversarial cookie injection: inject cookie into authenticatedPage context
    await authenticatedPage.context().addCookies([
      {
        name: 'adversarial_leak_probe',
        value: 'injected_secret_token_12345',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Verify injected cookie exists in authenticatedPage
    const updatedAuthCookies = await authenticatedPage.context().cookies();
    expect(updatedAuthCookies.some((c) => c.name === 'adversarial_leak_probe')).toBe(true);

    // Verify injected cookie DID NOT leak into unauthenticatedPage
    const probeUnauthCookies = await unauthenticatedPage.context().cookies();
    expect(probeUnauthCookies.some((c) => c.name === 'adversarial_leak_probe')).toBe(false);
    expect(probeUnauthCookies).toEqual([]);

    // Verify injected cookie DID NOT leak into secondaryAuthenticatedPage
    const probeSecCookies = await secondaryAuthenticatedPage.context().cookies();
    expect(probeSecCookies.some((c) => c.name === 'adversarial_leak_probe')).toBe(false);
    expect(probeSecCookies.some((c) => c.value === primaryTokenCookie!.value)).toBe(false);
  });

  test('2. Verify cross-context storage isolation (localStorage & DOM)', async ({
    authenticatedPage,
    secondaryAuthenticatedPage,
    unauthenticatedPage,
  }) => {
    // Intercept route to provide valid HTML origin without external network reliance
    const mockHtml = '<html><head><title>Storage Test</title></head><body>Isolated Origin</body></html>';
    await authenticatedPage.route('http://localhost:3000/isolation-test', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: mockHtml })
    );
    await secondaryAuthenticatedPage.route('http://localhost:3000/isolation-test', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: mockHtml })
    );
    await unauthenticatedPage.route('http://localhost:3000/isolation-test', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: mockHtml })
    );

    // Navigate all 3 pages
    await authenticatedPage.goto('http://localhost:3000/isolation-test');
    await secondaryAuthenticatedPage.goto('http://localhost:3000/isolation-test');
    await unauthenticatedPage.goto('http://localhost:3000/isolation-test');

    // Set localStorage in authenticated page
    await authenticatedPage.evaluate(() => {
      localStorage.setItem('user_session_token', 'primary_secret_123');
    });

    // Set different localStorage in secondary page
    await secondaryAuthenticatedPage.evaluate(() => {
      localStorage.setItem('user_session_token', 'secondary_secret_456');
    });

    // Verify values in primary and secondary
    const authVal = await authenticatedPage.evaluate(() => localStorage.getItem('user_session_token'));
    const secVal = await secondaryAuthenticatedPage.evaluate(() => localStorage.getItem('user_session_token'));
    expect(authVal).toBe('primary_secret_123');
    expect(secVal).toBe('secondary_secret_456');

    // Verify unauthenticated page cannot access either
    const unauthVal = await unauthenticatedPage.evaluate(() => localStorage.getItem('user_session_token'));
    expect(unauthVal).toBeNull();
  });

  test('3. Verify viewport resilience matches project device specifications', async ({
    authenticatedPage,
  }, testInfo) => {
    const viewport = authenticatedPage.viewportSize();
    const userAgent = await authenticatedPage.evaluate(() => navigator.userAgent);

    if (testInfo.project.name === 'Mobile Chrome') {
      expect(viewport).toEqual({ width: 393, height: 851 });
      expect(userAgent).toContain('Android');
      expect(userAgent).toContain('Pixel 5');
    } else if (testInfo.project.name === 'chromium') {
      expect(viewport).toEqual({ width: 1280, height: 720 });
      expect(userAgent).not.toContain('Android');
      expect(userAgent).not.toContain('Pixel 5');
    }
  });
});
