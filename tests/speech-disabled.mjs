import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const speechRequests = [];
  page.on('request', request => { if (/cases\/(speech|features)/.test(request.url())) speechRequests.push(request.url()); });
  await page.addInitScript(() => {
    window.speechAccesses = 0;
    Object.defineProperty(window, 'speechSynthesis', { get() { window.speechAccesses++; throw Error('Speech must stay off'); } });
  });
  for (let n = 1; n <= 10; n++) {
    await page.goto(new URL(`cases/05/BIZ-${String(n).padStart(2, '0')}/`, base).href);
    await page.waitForSelector('#site-navigation');
    assert.equal(await page.locator('.speech-controls,.block-speech-button,.speech-active,.speech-notice,script[src*="speech"],link[href*="speech"]').count(), 0);
    assert.equal(await page.evaluate(() => window.speechAccesses), 0);
  }
  assert.deepEqual(speechRequests, []);
  console.log('PASS OFF: ten cases have no speech DOM, assets, requests or speech initialization');
} finally { await browser.close(); }
