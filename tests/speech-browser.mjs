import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    await page.addInitScript(() => {
      const fake = new EventTarget(); fake.voices = []; fake.spoken = []; fake.canceled = 0;
      fake.getVoices = () => fake.voices;
      fake.cancel = () => { fake.canceled++; }; fake.resume = () => {};
      fake.speak = u => { fake.spoken.push(u); u.onstart?.(); };
      Object.defineProperty(window, 'speechSynthesis', { value: fake });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text; } } });
    });
    for (let n = 1; n <= 10; n++) {
      await page.goto(new URL(`cases/05/BIZ-${String(n).padStart(2, '0')}/`, base).href);
      await page.waitForSelector('.block-speech-button');
      const first = page.locator('.block-speech-button').first();
      assert.equal(await page.evaluate(() => speechSynthesis.spoken.length), 0);
      await first.click();
      assert.ok((await page.locator('.speech-status').innerText()).includes('한국어 음성을 찾지 못했습니다'));
      await page.evaluate(() => { speechSynthesis.voices = [{ name: '모의 한국어', lang: 'ko-KR' }]; speechSynthesis.dispatchEvent(new Event('voiceschanged')); });
      await first.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('.speech-active').count(), 1);
      const initial = await page.evaluate(() => speechSynthesis.spoken.length);
      await first.click(); assert.equal(await page.evaluate(() => speechSynthesis.spoken.length), initial);
      await page.getByRole('button', { name: '일시정지', exact: true }).click();
      await page.getByRole('combobox', { name: '읽기 속도' }).selectOption('1.5');
      await page.getByRole('button', { name: '이어읽기', exact: true }).click();
      assert.equal(await page.evaluate(() => speechSynthesis.spoken.at(-1).rate), 1.5);
      await page.locator('.block-speech-button').nth(2).click();
      assert.equal(await page.locator('.speech-active').count(), 1);
      assert.notEqual(await page.evaluate(() => speechSynthesis.spoken.at(-1).text), await page.evaluate(() => speechSynthesis.spoken[0].text));
      await page.getByRole('button', { name: '정지', exact: true }).click();
      assert.equal(await page.locator('.speech-active').count(), 0);
      const chunks = await page.evaluate(async () => (await import(new URL('../../../cases/speech.mjs', location.href))).storyChunks(document.querySelector('article')));
      assert.ok(!chunks.join(' ').includes('https://'));
      assert.ok(!chunks.join(' ').includes('속도 변경은 다음 문장'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await first.click();
      await page.evaluate(() => dispatchEvent(new Event('pagehide')));
      assert.equal(await page.locator('.speech-controls').getAttribute('data-state'), 'idle');
    }
    await page.close();
  }
  const unsupported = await browser.newPage();
  await unsupported.addInitScript(() => { delete window.SpeechSynthesisUtterance; });
  await unsupported.goto(new URL('cases/05/BIZ-01/', base).href);
  await unsupported.getByText('이 브라우저는 읽어주기를 지원하지 않습니다.', { exact: false }).waitFor();
  assert.equal(await unsupported.locator('.block-speech-button').count(), 0);
  await unsupported.close();
  console.log('PASS (mock speech): ten cases, desktop/mobile, delayed Korean voices, keyboard, block switching, pause/resume/rate/stop, pagehide, unsupported');
} finally { await browser.close(); }
