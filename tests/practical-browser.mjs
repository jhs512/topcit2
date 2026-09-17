import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { subjects } from '../practical/content.mjs';

const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('practical/', base).href);
    assert.equal(await page.locator('.area-card').count(), 8);
    for (const s of subjects) {
      await page.locator(`.area-card[href="${s.id}/"]`).click();
      await page.locator('#site-tts-toggle').waitFor();
      assert.equal(await page.locator('.concept').count(), 20);
      const paragraphCount = text => text.split(/\n\s*\n/).length;
      const expectedReadable = s.items.reduce((n, [,explanation,example]) => n + 2 + paragraphCount(explanation) + paragraphCount(example), 0);
      assert.equal(await page.locator('.concept > h2.tts-readable, .concept > p.tts-readable, .concept > .example > p.tts-readable').count(), expectedReadable);
      assert.match(await page.locator('.editor-note').innerText(), /교재 개념의 뜻을 설명/);
      assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= innerWidth), true, `${s.id} overflow at ${width}`);
      await page.locator('.contents a').last().click();
      assert.equal(new URL(page.url()).hash, '#concept-20');
      const top = await page.locator('#concept-20').evaluate(el => el.getBoundingClientRect().top);
      assert.ok(top >= 0 && top < 200, `anchor ${s.id}: ${top}`);
      await page.locator('#concept-20 .to-contents').click();
      assert.equal(new URL(page.url()).hash, '#contents');
      await page.goto(new URL('practical/', base).href);
    }
    await page.goto(new URL('practical/05-01/', base).href);
    await page.locator('#site-tts-toggle').click();
    await page.locator('.block-speech-button').first().waitFor({ timeout: 10000 });
    assert.ok(await page.locator('.concept .block-speech-button').count() >= 80);
    await page.reload();
    await page.locator('.block-speech-button').first().waitFor({ timeout: 10000 });
    assert.equal(await page.locator('#site-tts-toggle').getAttribute('aria-pressed'), 'true');
    await page.locator('#site-tts-toggle').click();
    await page.waitForFunction(() => !document.querySelector('.block-speech-button'));
    assert.deepEqual(errors, []);
    console.log(`practical ${width}px: 8 subjects, 160 concepts, anchors, overflow, TTS passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
