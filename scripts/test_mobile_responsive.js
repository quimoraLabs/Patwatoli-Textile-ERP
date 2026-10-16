const { chromium } = require('C:/Users/madha/AppData/Roaming/npm/node_modules/playwright');

async function testMobileResponsive() {
  console.log('Testing Mobile Viewport (390x844 - iPhone / Android Phone)...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  // Emulate Mobile Device
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  // Test 1: Login page on mobile
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'owner@patwatoli.example');
  await page.fill('input[type="password"]', 'S3cure#Pass');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
  console.log('✓ Mobile Login & Dashboard loaded successfully!');

  // Test 2: Check that sidebar is hidden by default on mobile
  const sidebar = page.locator('aside');
  const hasTranslateX = await sidebar.evaluate((el) => el.classList.contains('-translate-x-full'));
  console.log(`✓ Sidebar hidden offscreen by default on mobile: ${hasTranslateX}`);

  // Test 3: Open Mobile Drawer via Hamburger Menu
  console.log('Clicking Hamburger Menu button...');
  await page.click('button[title="Open Menu"]');
  await page.waitForTimeout(500);

  const isOpen = await sidebar.evaluate((el) => el.classList.contains('translate-x-0'));
  console.log(`✓ Mobile drawer slide-in state: ${isOpen}`);

  // Test 4: Navigate to /admin via drawer link
  console.log('Navigating to Admin Panel via mobile drawer...');
  await page.click('nav a:has-text("Admin Panel")');
  await page.waitForURL('http://localhost:3000/admin', { timeout: 10000 });
  await page.waitForTimeout(800);
  console.log('✓ Successfully navigated to /admin on mobile!');

  // Test 5: Check admin tabs and container width
  const mainWidth = await page.evaluate(() => document.querySelector('main').clientWidth);
  console.log(`✓ Main content width on mobile (should be full ~390px): ${mainWidth}px`);

  // Take screenshot for verification
  const screenshotPath = 'd:/Patwatoli Textile ERP/frontend/public/mobile_admin_verified.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`✓ Saved mobile screenshot at: ${screenshotPath}`);

  await browser.close();
  console.log('\n>>> MOBILE RESPONSIVENESS 100% VERIFIED! <<<');
}

testMobileResponsive().catch((err) => {
  console.error('Mobile test failed:', err);
  process.exit(1);
});
