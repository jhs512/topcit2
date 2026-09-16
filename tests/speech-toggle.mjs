import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
const tick = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const mock = () => {
  const synth = new EventTarget();
  synth.voices = [{ name: 'Mock Korean', lang: 'ko-KR' }]; synth.spoken = []; synth.canceled = 0; synth.reads = 0;
  synth.getVoices = () => { synth.reads++; return synth.voices; };
  synth.cancel = () => synth.canceled++; synth.resume = () => {};
  synth.speak = u => { synth.spoken.push(u); u.onstart?.(); };
  Object.defineProperty(window, 'speechSynthesis', { value: synth });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text; } } });
};
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(mock);
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('cases/05/BIZ-09/', base).href);
    const toggle = page.locator('#site-tts-toggle'); await toggle.waitFor();
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => speechSynthesis.reads), 0);
    const off = async () => {
      await page.waitForFunction(() => !document.querySelector('.speech-controls,.block-speech-button,.speech-active,.speech-notice,link[href$="/speech.css"]'));
      await tick(page);
      assert.equal(await page.locator('.speech-block,.block-speech-button').count(), 0);
    };
    for (let i = 0; i < 3; i++) {
      await toggle.focus(); await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
      await page.locator('.case-lesson .block-speech-button').first().waitFor();
      assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.speech-controls').count(), 1);
      assert.equal(await page.evaluate(() => speechSynthesis.spoken.length), i);
      assert.ok(await page.locator('.tts-readable').evaluateAll(nodes => nodes.every(n => n.querySelectorAll(':scope > .block-speech-button').length <= 1)));
      await page.locator('.lesson-concrete .block-speech-button').click();
      await page.waitForSelector('.speech-controls[data-state="speaking"]');
      await toggle.click(); await off();
      const count = await page.evaluate(() => speechSynthesis.spoken.length);
      const reads = await page.evaluate(() => speechSynthesis.reads);
      await page.evaluate(() => {
        speechSynthesis.spoken.at(-1).onend?.(); speechSynthesis.dispatchEvent(new Event('voiceschanged'));
        const p = document.createElement('p'); p.className = 'tts-readable'; p.textContent = '꺼진 동안 추가한 글'; document.querySelector('main').append(p);
      });
      await tick(page); await off();
      assert.equal(await page.evaluate(() => speechSynthesis.spoken.length), count);
      assert.equal(await page.evaluate(() => speechSynthesis.reads), reads);
    }
    await toggle.click(); await page.locator('.block-speech-button').first().waitFor();
    await page.reload(); await page.locator('.block-speech-button').first().waitFor();
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => speechSynthesis.spoken.length), 0);
    await page.goto(new URL('cases/05/BIZ-01/', base).href); await page.locator('.block-speech-button').first().waitFor();
    const other = await context.newPage(); await other.goto(new URL('practice/05/', base).href);
    await other.locator('.block-speech-button').first().waitFor();
    await other.locator('#site-tts-toggle').click(); await off();
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    await other.locator('#site-tts-toggle').click(); await page.locator('.block-speech-button').first().waitFor();
    await toggle.click(); await off(); await page.reload(); await toggle.waitFor();
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.ok(await toggle.evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.height >= 44; }));
    assert.deepEqual(errors, []); await context.close();
  }
  // Hold the lazy module response while the visitor switches OFF.
  const context = await browser.newContext(); await context.addInitScript(mock);
  const page = await context.newPage();
  let release, requested;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { requested = resolve; });
  await page.route('**/shared/speech.mjs*', async route => { requested(); await gate; await route.continue(); });
  await page.goto(new URL('cases/05/BIZ-01/', base).href);
  await page.locator('#site-tts-toggle').click(); await started;
  await page.locator('#site-tts-toggle').click(); release();
  await page.waitForResponse('**/shared/speech-engine.mjs'); await tick(page);
  assert.equal(await page.locator('.speech-controls,.block-speech-button').count(), 0);
  assert.equal(await page.evaluate(() => speechSynthesis.reads), 0);
  await page.locator('#site-tts-toggle').click(); await page.locator('.block-speech-button').first().waitFor();
  // Voice discovery arriving after OFF must not create UI or trigger speech.
  await page.evaluate(() => { speechSynthesis.voices = []; });
  await page.locator('.block-speech-button').first().click();
  await page.locator('#site-tts-toggle').click();
  await page.evaluate(() => { speechSynthesis.voices = [{ lang: 'ko-KR' }]; speechSynthesis.dispatchEvent(new Event('voiceschanged')); });
  await tick(page);
  assert.equal(await page.locator('.speech-controls,.speech-notice,.block-speech-button').count(), 0);
  assert.equal(await page.evaluate(() => speechSynthesis.spoken.length), 0);
  await context.close();
  console.log('PASS toggle (mock): default OFF, keyboard, ON/OFF/re-ON cleanup, stale events, import race, reload/navigation, cross-tab preference, no autoplay, mobile bounds');
} finally { await browser.close(); }
