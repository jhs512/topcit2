import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
const base = process.env.SITE_BASE || 'http://localhost:4186/';
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('topcit2:tts-enabled', 'true');
    const synth = new EventTarget();
    synth.spoken = []; synth.getVoices = () => [{ lang: 'ko-KR' }];
    synth.cancel = synth.resume = () => {};
    synth.speak = utterance => synth.spoken.push(utterance);
    Object.defineProperty(window, 'speechSynthesis', { value: synth });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text; } } });
  });
  await page.goto(new URL('study/', base).href);
  const paragraph = page.locator('li.tts-readable').filter({ hasText: '오늘 공부할 항목을' });
  await paragraph.locator('button').click();
  await page.evaluate(() => speechSynthesis.spoken.at(-1).onend());
  const expected = '오늘 공부할 항목을 출제기준에서 고릅니다.';
  assert.equal(await page.evaluate(() => speechSynthesis.spoken.at(-1).text), expected);
  await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
  assert.equal(await page.locator('.speech-current-sentence p').textContent(), expected);
  assert.equal(await page.evaluate(() => [...CSS.highlights.get('speech-sentence')].map(range => range.toString()).join('')), expected);
  console.log('PASS: study inline link included in utterance, context, and highlight');
} finally { await browser.close(); }
