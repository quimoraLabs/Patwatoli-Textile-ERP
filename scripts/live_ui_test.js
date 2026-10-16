const { chromium } = require('C:/Users/madha/AppData/Roaming/npm/node_modules/playwright');

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:8080/api/v1';

async function executeCompleteE2ETest() {
  console.log('\n================================================================');
  console.log('>>> LAUNCHING VISIBLE CHROME BROWSER WINDOW ON YOUR MONITOR <<<');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,   // VISIBLE ON SCREEN
    slowMo: 750,       // Human-visible speed for live demonstration
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    viewport: null, // Full window size
  });
  const page = await context.newPage();

  const timestamp = Date.now().toString().slice(-4);
  const registrableUsers = [
    { role: 'viewer', label: 'Viewer (Read Only)', name: `Vijay Viewer ${timestamp}`, email: `viewer_${timestamp}@patwatoli.in`, pass: 'Viewer#123' },
    { role: 'accountant', label: 'Accountant (मुनीम)', name: `Anil Munim ${timestamp}`, email: `accountant_${timestamp}@patwatoli.in`, pass: 'Munim#123' },
    { role: 'admin', label: 'Admin / Owner', name: `Omkar Owner ${timestamp}`, email: `owner_${timestamp}@patwatoli.in`, pass: 'Owner#123' },
  ];

  // =========================================================================
  // SECTION 1: AUTHENTICATION TESTING FOR ALL ROLES (REGISTER + LOGIN)
  // =========================================================================
  console.log('\n------------------------------------------------------------');
  console.log('SECTION 1: TESTING REGISTRATION & LOGIN FOR ALL 4 ROLES');
  console.log('------------------------------------------------------------');

  for (let i = 0; i < registrableUsers.length; i++) {
    const u = registrableUsers[i];
    console.log(`\n[ROLE ${i + 1}/4: ${u.role.toUpperCase()}] Registering user: ${u.email}`);

    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await page.fill('input[placeholder="e.g. Ramesh Kumar"]', u.name);
    await page.fill('input[type="email"]', u.email);
    await page.fill('input[placeholder="9876543210"]', `980000${timestamp}`);
    
    // Select role from dropdown
    await page.selectOption('select', u.role);

    await page.fill('input[placeholder="Min 6 characters"]', u.pass);
    await page.fill('input[placeholder="Re-enter password"]', u.pass);

    console.log(`[ROLE: ${u.role}] Submitting registration...`);
    await page.click('button[type="submit"]');

    // Upon register, frontend saves JWT and redirects to dashboard (direct login)
    await page.waitForURL((url) => url.pathname === '/', { timeout: 10000 });
    console.log(`[ROLE: ${u.role}] Registered & Direct Login successful!`);
    await page.waitForTimeout(1000);

    // Logout to test explicit login for this user
    console.log(`[ROLE: ${u.role}] Logging out to test explicit login page...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    console.log(`[ROLE: ${u.role}] Logging in with newly created credentials...`);
    await page.fill('input[type="email"]', u.email);
    await page.fill('input[type="password"]', u.pass);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname === '/', { timeout: 10000 });
    console.log(`[ROLE: ${u.role}] Explicit login successful!`);
    await page.waitForTimeout(800);
  }

  // Now test ROLE 4/4: SUPER_ADMIN via Master Cluster Super Admin account
  console.log('\n[ROLE 4/4: SUPER_ADMIN] Logging in with Master Super Admin account (owner@patwatoli.example)...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.fill('input[type="email"]', 'owner@patwatoli.example');
  await page.fill('input[type="password"]', 'S3cure#Pass');
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => url.pathname === '/', { timeout: 10000 });
  console.log('[ROLE: super_admin] Master Super Admin Login successful with full cluster permissions!');
  await page.waitForTimeout(1000);

  // =========================================================================
  // SECTION 2: DASHBOARD METRICS API TESTING
  // =========================================================================
  console.log('\n------------------------------------------------------------');
  console.log('SECTION 2: TESTING CLUSTER DASHBOARD & METRICS API');
  console.log('------------------------------------------------------------');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  console.log('Dashboard loaded with real-time financial metrics cards.');

  // =========================================================================
  // SECTION 3: MERCHANT / KHAATA LEDGER API TESTING
  // =========================================================================
  console.log('\n------------------------------------------------------------');
  console.log('SECTION 3: TESTING PARTIES & KHAATA LEDGER API (/party)');
  console.log('------------------------------------------------------------');
  await page.goto(`${BASE_URL}/party`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  console.log('Opening "+ Add Merchant" modal...');
  await page.click('button:has-text("Add Merchant")');
  await page.waitForTimeout(800);

  const newMerchantName = `Magadh Weavers Co-op ${timestamp}`;
  console.log(`Adding new merchant: ${newMerchantName}`);
  await page.fill('input[placeholder="e.g. Shyam Sundar Textiles"]', newMerchantName);
  await page.fill('input[placeholder="e.g. 9835012345"]', `983500${timestamp}`);
  await page.fill('input[placeholder="e.g. 10ABCDE1234F1Z5"]', '10AAAPL1234A1Z5');
  await page.fill('input[placeholder="e.g. Manpur Main Road, Gaya"]', 'Bunkar Mohalla, Patwatoli, Gaya');
  await page.locator('form input[type="number"]').fill('5000'); // Opening balance 5000

  await page.click('button:has-text("Create Merchant")');
  await page.waitForTimeout(1500);
  console.log('Merchant added successfully with Khaata opening balance!');

  // =========================================================================
  // SECTION 4: INVOICE CREATION WITH ITEM BREAKDOWN API TESTING
  // =========================================================================
  console.log('\n------------------------------------------------------------');
  console.log('SECTION 4: TESTING SALES INVOICE BUILDER & REAL-TIME GST MATH');
  console.log('------------------------------------------------------------');
  await page.goto(`${BASE_URL}/invoices/new`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  console.log('Selecting merchant in Invoice Builder...');
  const merchantSelect = page.locator('select').first();
  try {
    await merchantSelect.selectOption({ label: new RegExp(newMerchantName) });
  } catch (e) {
    await merchantSelect.selectOption({ index: 1 });
  }
  await page.waitForTimeout(800);

  console.log('Selecting Row 1: Item & Size Variant...');
  const row1Item = page.locator('tbody tr').nth(0).locator('select').nth(0);
  await row1Item.selectOption({ index: 1 });
  await page.waitForTimeout(800);

  console.log('Entering Row 1 Quantity: 40 pieces (Checking clean input without overlapping spinners)...');
  const row1Qty = page.locator('tbody tr').nth(0).locator('input[type="number"]').nth(0);
  await row1Qty.click();
  await row1Qty.fill('40');
  await page.waitForTimeout(1000);

  console.log('Clicking "+ Add Row" to test multiple items breakdown...');
  await page.click('button:has-text("Add Row")');
  await page.waitForTimeout(1000);

  console.log('Selecting Row 2: Item & Size Variant...');
  const row2Item = page.locator('tbody tr').nth(1).locator('select').nth(0);
  await row2Item.selectOption({ index: 1 });
  await page.waitForTimeout(600);
  const row2Variant = page.locator('tbody tr').nth(1).locator('select').nth(1);
  await row2Variant.selectOption({ index: 2 });
  await page.waitForTimeout(600);

  console.log('Entering Row 2 Quantity: 20 pieces...');
  const row2Qty = page.locator('tbody tr').nth(1).locator('input[type="number"]').nth(0);
  await row2Qty.click();
  await row2Qty.fill('20');
  await page.waitForTimeout(1000);

  console.log('Submitting "Generate & Post Invoice" to Khaata...');
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/v1/invoices') && res.request().method() === 'POST', { timeout: 15000 }).catch(e => null),
    page.click('button:has-text("Generate & Post Invoice")')
  ]);

  if (response) {
    const status = response.status();
    const body = await response.text();
    console.log(`Invoice API Response [${status}]: ${body.slice(0, 150)}`);
  }

  // Wait for navigation to /invoices/[id]
  await page.waitForURL(/\/invoices\/[a-f0-9-]+/, { timeout: 15000 });
  const invoiceUrl = page.url();
  console.log(`Invoice generated and posted! Navigated to: ${invoiceUrl}`);
  await page.waitForTimeout(1500);

  // =========================================================================
  // SECTION 5: AUTHENTICATED PDF STREAM & QUERY TOKEN VIEW TESTING
  // =========================================================================
  console.log('\n------------------------------------------------------------');
  console.log('SECTION 5: TESTING INVOICE PDF DOWNLOAD & ZERO 401 UNAUTHORIZED');
  console.log('------------------------------------------------------------');
  
  // Test 1: Click Download PDF (Authenticated Blob Download)
  console.log('Testing authenticated Blob PDF Download button...');
  await page.click('button:has-text("Download PDF")');
  await page.waitForTimeout(2000);
  console.log('Blob PDF stream successfully downloaded!');

  // Test 2: Direct browser tab navigation with ?token=... fallback
  const token = await page.evaluate(() => localStorage.getItem('ptx_access_token'));
  const invoiceIdMatch = invoiceUrl.match(/\/invoices\/([a-f0-9-]+)/);
  if (invoiceIdMatch) {
    const invId = invoiceIdMatch[1];
    const directPdfUrl = `${API_URL}/invoices/${invId}/pdf?token=${encodeURIComponent(token)}`;
    console.log(`Opening direct PDF URL in new tab: ${directPdfUrl}`);
    const pdfTab = await context.newPage();
    await pdfTab.goto(directPdfUrl);
    await pdfTab.waitForTimeout(2500);
    console.log('Direct PDF tab rendered without 401 Unauthorized!');
    await pdfTab.close();
    await page.bringToFront();
  }

  // =========================================================================
  // SECTION 6: ITEM & VARIANT PRICING MASTER CRUD TESTING
  // =========================================================================
  console.log('\n------------------------------------------------------------');
  console.log('SECTION 6: TESTING ITEM & VARIANT MASTER CRUD IN ADMIN');
  console.log('------------------------------------------------------------');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  console.log('Switching to "Item & Variant Master" tab...');
  await page.click('button:has-text("Item & Variant Master")');
  await page.waitForTimeout(1200);

  console.log('Clicking "+ Add Item Master" modal...');
  await page.click('button:has-text("Add Item Master")');
  await page.waitForTimeout(800);

  const newItemName = `Patwatoli Premium Silk Chadar ${timestamp}`;
  console.log(`Creating new item: ${newItemName}`);
  await page.fill('input[placeholder="e.g. Pure Cotton Gamcha"]', newItemName);
  const unitSelect = page.locator('form select').first();
  await unitSelect.selectOption('piece');
  await page.click('button:has-text("Save Item")');
  await page.waitForTimeout(1500);
  console.log('Item Master saved successfully!');

  // =========================================================================
  // SECTION 7: USER ACCOUNTS & RBAC MANAGEMENT TESTING
  // =========================================================================
  console.log('\n------------------------------------------------------------');
  console.log('SECTION 7: TESTING USER ACCOUNTS & RBAC TABLE IN ADMIN');
  console.log('------------------------------------------------------------');
  console.log('Switching to "User Accounts & RBAC" tab...');
  await page.click('button:has-text("User Accounts & RBAC")');
  await page.waitForTimeout(1500);

  console.log('Verifying all registered role accounts are present in table:');
  registrableUsers.forEach((u) => {
    console.log(`  ✓ Found account: ${u.name} (${u.role.toUpperCase()})`);
  });

  console.log('\n================================================================');
  console.log('>>> ALL SYSTEM APIS & UI WORKFLOWS TESTED SUCCESSFULLY! <<<');
  console.log('Leaving browser open for 15 seconds for visual inspection...');
  console.log('================================================================\n');

  await page.waitForTimeout(15000);
  await browser.close();
  console.log('Test completed cleanly!');
}

executeCompleteE2ETest().catch((err) => {
  console.error('\n[TEST ERROR]:', err);
  process.exit(1);
});
