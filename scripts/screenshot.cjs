const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const placeholderBase64 = fs.readFileSync(path.join(__dirname, 'placeholder.png')).toString('base64');
const placeholderDataUrl = `data:image/png;base64,${placeholderBase64}`;

(async () => {
  fs.mkdirSync('public/screenshots', { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ['camera'],
  });

  async function injectPlaceholder(page, dataUrl) {
    await page.evaluate((dataUrl) => {
      const viewfinder = document.querySelector('.viewfinder');
      if (!viewfinder) return;
      // Hide video and error
      const video = viewfinder.querySelector('video');
      if (video) video.style.display = 'none';
      const err = viewfinder.querySelector('.camera-error');
      if (err) err.style.display = 'none';
      // Inject placeholder image
      const existing = viewfinder.querySelector('#pw-placeholder');
      if (!existing) {
        const img = document.createElement('img');
        img.id = 'pw-placeholder';
        img.src = dataUrl;
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;transform:scaleX(-1);';
        viewfinder.appendChild(img);
      }
    }, dataUrl);
  }

  // 1. Board screenshot (desktop)
  const board = await context.newPage();
  await board.setViewportSize({ width: 1280, height: 800 });
  await board.goto('https://localhost:5300', { waitUntil: 'domcontentloaded' });
  await board.waitForTimeout(2500);
  await board.screenshot({ path: 'public/screenshots/board.png' });
  console.log('board.png saved');

  // 2. Camera view — click NEW STRIP to dismiss board
  const newStripBtn = await board.$('button.btn-arcade-green');
  if (newStripBtn) await newStripBtn.click();
  await board.waitForTimeout(1000);
  await injectPlaceholder(board, placeholderDataUrl);
  await board.waitForTimeout(500);
  await board.screenshot({ path: 'public/screenshots/camera.png' });
  console.log('camera.png saved');

  // 3. Mobile board screenshot
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto('https://localhost:5300', { waitUntil: 'domcontentloaded' });
  await mobile.waitForTimeout(2500);
  await mobile.screenshot({ path: 'public/screenshots/mobile-board.png' });
  console.log('mobile-board.png saved');

  // 4. Mobile camera view
  const newStripMobile = await mobile.$('button.btn-arcade-green');
  if (newStripMobile) await newStripMobile.click();
  await mobile.waitForTimeout(1000);
  await injectPlaceholder(mobile, placeholderDataUrl);
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: 'public/screenshots/mobile-camera.png' });
  console.log('mobile-camera.png saved');

  await browser.close();
  console.log('Done!');
})();
