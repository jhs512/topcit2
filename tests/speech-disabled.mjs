import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const speechRequests = [];
  page.on('request', request => { if (/(?:cases|shared)\/speech(?:-engine)?\.(?:mjs|css)/.test(request.url())) speechRequests.push(request.url()); });
  await page.addInitScript(() => {
    window.speechAccesses = 0;
    Object.defineProperty(window, 'speechSynthesis', { get() { window.speechAccesses++; throw Error('Speech must stay off'); } });
  });
  for (const route of ['', 'textbook/', 'textbook/05/', 'info/', 'practice/', 'practice/05/', ...Array.from({length:10}, (_, i) => `cases/05/BIZ-${String(i + 1).padStart(2, '0')}/`)]) {
    await page.goto(new URL(route, base).href);
    await page.waitForSelector('#site-navigation');
    assert.equal(await page.locator('#site-tts-toggle').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('.speech-controls,.block-speech-button,.speech-active,.speech-notice,script[src$="/speech.mjs"],link[href*="speech"]').count(), 0);
    assert.equal(await page.evaluate(() => window.speechAccesses), 0);
  }
  assert.deepEqual(speechRequests, []);
  console.log('PASS OFF: site pages have no speech DOM, assets, requests or speech initialization');
} finally { await browser.close(); }
