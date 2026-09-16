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
      assert.equal(await page.locator('.concept').count(), 10);
      assert.equal(await page.locator('.concept .tts-readable').count(), 40);
      assert.match(await page.locator('.editor-note').innerText(), /자체 선정/);
      assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= innerWidth), true, `${s.id} overflow at ${width}`);
      await page.locator('.contents a').last().click();
      assert.equal(new URL(page.url()).hash, '#concept-10');
      const top = await page.locator('#concept-10').evaluate(el => el.getBoundingClientRect().top);
      assert.ok(top >= 0 && top < 200, `anchor ${s.id}: ${top}`);
      await page.locator('#concept-10 .to-contents').click();
      assert.equal(new URL(page.url()).hash, '#contents');
      await page.goto(new URL('practical/', base).href);
    }
    await page.goto(new URL('practical/05-01/', base).href);
    await page.locator('#site-tts-toggle').click();
    await page.locator('.block-speech-button').first().waitFor({ timeout: 10000 });
    assert.ok(await page.locator('.concept .block-speech-button').count() >= 40);
    await page.reload();
    await page.locator('.block-speech-button').first().waitFor({ timeout: 10000 });
    assert.equal(await page.locator('#site-tts-toggle').getAttribute('aria-pressed'), 'true');
    await page.locator('#site-tts-toggle').click();
    await page.waitForFunction(() => !document.querySelector('.block-speech-button'));
    assert.deepEqual(errors, []);
    console.log(`practical ${width}px: 8 subjects, 80 concepts, anchors, overflow, TTS passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
