const { chromium } = require('C:/Users/madha/AppData/Roaming/npm/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function generateIcons() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();

  const svgPath = path.resolve(__dirname, '../frontend/public/icon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  const targets = [
    { size: 192, filename: 'icon-192.png' },
    { size: 512, filename: 'icon-512.png' },
    { size: 180, filename: 'apple-touch-icon.png' },
    { size: 512, filename: 'icon-maskable-512.png' },
    { size: 192, filename: 'icon-maskable-192.png' }
  ];

  for (const t of targets) {
    await page.setViewportSize({ width: t.size, height: t.size });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: ${t.size}px; height: ${t.size}px; background: transparent; overflow: hidden; }
            svg { width: 100%; height: 100%; display: block; }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `);

    const outPath = path.resolve(__dirname, `../frontend/public/${t.filename}`);
    await page.screenshot({ path: outPath, omitBackground: true });
    console.log(`Generated: ${t.filename} (${t.size}x${t.size})`);
  }

  await browser.close();
  console.log('All PWA icons generated successfully!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
