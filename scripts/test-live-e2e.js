const { chromium } = require('playwright');

async function testLive() {
  const browser = await chromium.launch({ headless: true });

  // 1. Test 1-Click login from landing page
  {
    const page = await browser.newPage();
    console.log('1. Navigating to https://cma-passq.vercel.app ...');
    await page.goto('https://cma-passq.vercel.app', { waitUntil: 'networkidle' });
    console.log('   Title:', await page.title());

    console.log('   Clicking 1-Click login button...');
    const btn = page.getByRole('button', { name: /Vào Bảng Điều Khiển Học Ngay|Vào học ngay/i }).first();
    await btn.click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('   1-Click Login SUCCESS! URL:', page.url());
    await page.close();
  }

  // 2. Test manual form login on /login
  {
    const page = await browser.newPage();
    console.log('2. Navigating to https://cma-passq.vercel.app/login ...');
    await page.goto('https://cma-passq.vercel.app/login', { waitUntil: 'networkidle' });

    console.log('   Typing credentials into form inputs...');
    await page.locator('input[name="email"]').fill('student@passq.test');
    await page.locator('input[name="password"]').fill('Password123!');

    console.log('   Submitting form...');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('   Manual Login Form SUCCESS! URL:', page.url());
    await page.close();
  }

  // 3. Test 1-Click demo button on /login
  {
    const page = await browser.newPage();
    console.log('3. Navigating to https://cma-passq.vercel.app/login for 1-Click demo test ...');
    await page.goto('https://cma-passq.vercel.app/login', { waitUntil: 'networkidle' });

    console.log('   Clicking "Đăng nhập 1-Click bằng tài khoản mẫu"...');
    const demoBtn = page.getByRole('button', { name: /Đăng nhập 1-Click bằng tài khoản mẫu/i });
    await demoBtn.click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('   /login 1-Click Demo Login SUCCESS! URL:', page.url());
    await page.close();
  }

  await browser.close();
  console.log('=== ALL 3 LIVE AUTHENTICATION PATHS PASSED ON VERCEL ===');
}

testLive().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
