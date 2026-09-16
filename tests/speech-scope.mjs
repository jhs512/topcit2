import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { books } from '../output/markdown/books.mjs';
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    await page.addInitScript(() => localStorage.setItem('topcit2:tts-enabled', 'true'));
    for (const route of ['', 'textbook/', 'output/markdown/', 'info/', 'exam/', 'practice/', 'cases/', 'cases/05/', 'practice/01/']) {
      await page.goto(new URL(route, base).href);
      await page.waitForSelector('.speech-controls', { state: 'attached' });
      if (route.startsWith('practice/')) await page.locator('.intro,.complete').first().waitFor();
      assert.equal(await page.locator('.tts-readable,.block-speech-button').count(), 0, route + ': UI only');
      assert.equal(await page.locator('#site-tts-toggle').getAttribute('aria-pressed'), 'true');
    }
    for (const book of books) {
      await page.goto(new URL(`textbook/${book.id}/#page-${String(book.startPage).padStart(3, '0')}`, base).href);
      await page.waitForSelector('body[data-ready="true"]', { timeout: 60000 });
      await page.locator('#book .block-speech-button').first().waitFor();
      assert.equal(await page.locator('#sidebar .tts-readable, .intro .tts-readable, #zoom-title.tts-readable, .contents-link .tts-readable').count(), 0);
      assert.equal(await page.locator('.book-page').evaluateAll((nodes, start) => nodes.filter(n => Number(n.id.slice(5)) < start).reduce((count, n) => count + n.querySelectorAll('.tts-readable,.block-speech-button').length, 0), book.startPage), 0);
      assert.ok(await page.locator('.book-page[data-tts-content] h1.tts-readable,.book-page[data-tts-content] h2.tts-readable,.book-page[data-tts-content] h3.tts-readable').count());
    }
    for (let n = 1; n <= 10; n++) {
      await page.goto(new URL(`cases/05/BIZ-${String(n).padStart(2, '0')}/`, base).href);
      await page.locator('.case-body .block-speech-button').first().waitFor();
      for (const selector of ['article h1', '.lesson-abstract', '.lesson-concrete', '.case-body', '.case-conclusion']) assert.ok(await page.locator(`${selector} .block-speech-button`).count());
      assert.equal(await page.locator('.case-type .block-speech-button,.case-concept .block-speech-button,.lesson-basis .block-speech-button,.case-references .block-speech-button').count(), 0);
    }
    // An accidental marker in UI still does not opt that UI into speech.
    await page.evaluate(() => { const p = document.createElement('p'); p.className = 'tts-readable'; p.id = 'ui-marker'; p.textContent = '페이지 이용 안내'; document.querySelector('main').append(p); });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.equal(await page.locator('#ui-marker .block-speech-button').count(), 0);
    assert.ok(await page.locator('.block-speech-button').evaluateAll(nodes => nodes.every(n => n.closest('[data-tts-content]'))));
    await page.close();
  }
  console.log('PASS scope: PC/mobile UI-only pages have zero markers/buttons; all six books exclude front matter/contents; 10 stories retain educational sections; unscoped UI markers ignored');
} finally { await browser.close(); }
