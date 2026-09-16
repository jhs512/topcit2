import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const base = process.env.SITE_BASE || 'http://localhost:4186/';
try {
  for (const width of [1280, 390, 320]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.addInitScript(() => {
      localStorage.setItem('topcit2:tts-enabled', 'true');
      const s = new EventTarget(); s.spoken = []; s.getVoices = () => [{ lang: 'ko-KR' }];
      s.cancel = s.resume = () => {}; s.speak = u => s.spoken.push(u);
      Object.defineProperty(window, 'speechSynthesis', { value: s });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text; } } });
    });
    await page.goto(new URL('textbook/01/#page-022', base).href); await page.waitForSelector('body[data-ready="true"]');
    const first = 'IT는 API v2.5를 설명합니다.';
    const long = '긴 문장의 문맥을 유지합니다 '.repeat(40) + '끝입니다.';
    await page.evaluate(({ first, long, theme }) => {
      document.documentElement.dataset.theme = theme;
      const box = document.createElement('section'); box.id = 'context-fixture'; box.dataset.ttsContent = '';
      box.innerHTML = `<p class="tts-readable">${first} ${long} 같은 문장. 같은 문장.</p><p class="tts-readable">부호 없는 제목 <a href="#">제외링크</a><span hidden>숨김정답</span> https://secret.test</p>`;
      document.querySelector('main').append(box);
    }, { first, long, theme });
    const buttons = page.locator('#context-fixture button'); await buttons.first().waitFor();
    const lines = () => page.locator('.speech-context [data-sentence]').allTextContents();
    const highlighted = () => page.evaluate(() => [...(CSS.highlights.get('speech-sentence') || [])].map(r => r.toString()).join(''));
    const start = () => page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
    const end = () => page.evaluate(() => speechSynthesis.spoken.at(-1).onend());
    await buttons.first().click(); assert.equal(await page.locator('.speech-context').isVisible(), false);
    await start(); assert.equal(await page.evaluate(() => speechSynthesis.spoken.at(-1).text), '아이티는 에이피아이 v2.5를 설명합니다.'); assert.deepEqual(await lines(), ['없음', first, long]); assert.equal(await highlighted(), first);
    await end(); await start(); assert.deepEqual(await lines(), [first, long, '같은 문장.']); assert.equal(await highlighted(), long);
    assert.ok(await page.locator('.speech-context').evaluate(c => [...c.querySelectorAll('p')].some(p => p.scrollHeight > p.clientHeight)));
    const beforePause = await lines();
    await page.getByRole('button', { name: '일시정지', exact: true }).click(); assert.deepEqual(await lines(), beforePause);
    await page.getByRole('combobox', { name: '읽기 속도' }).selectOption('2.5');
    await page.getByRole('button', { name: '이어읽기', exact: true }).click(); await start();
    assert.equal(await page.evaluate(() => speechSynthesis.spoken.at(-1).rate), 2.5);
    let steps = 0;
    while (await page.evaluate(() => speechSynthesis.spoken.at(-1).text) !== '같은 문장.') {
      assert.deepEqual(await lines(), beforePause); assert.equal(await highlighted(), long);
      await end(); await start(); assert.ok(++steps < 20);
    }
    assert.ok(steps > 2); assert.deepEqual(await lines(), [long, '같은 문장.', '같은 문장.']);
    await end(); await start(); assert.deepEqual(await lines(), ['같은 문장.', '같은 문장.', '없음']);
    assert.equal(await page.locator('.speech-context').getAttribute('aria-live'), 'off');
    const geometry = await page.locator('.speech-controls').evaluate(el => {
      const r = el.getBoundingClientRect(), c = el.querySelector('.speech-context');
      return { right: innerWidth - r.right, bottom: innerHeight - r.bottom, inside: r.top >= 0 && r.left >= 0, scrollable: c.scrollHeight > c.clientHeight, contextHeight: c.clientHeight };
    });
    assert.ok(geometry.inside && Math.abs(geometry.right - 16) < 1 && Math.abs(geometry.bottom - 16) < 1 && geometry.contextHeight <= 280);
    await end(); assert.equal(await page.locator('.speech-context').isVisible(), false); assert.deepEqual(await lines(), ['', '', '']);
    await buttons.nth(1).click(); await start(); assert.deepEqual(await lines(), ['없음', '부호 없는 제목', '없음']);
    await page.getByRole('button', { name: '정지', exact: true }).click(); assert.deepEqual(await lines(), ['', '', '']);
    await buttons.first().click(); await start();
    await page.locator('#context-fixture p').first().evaluate(p => p.firstChild.data = '내용 교체.');
    await page.waitForFunction(() => document.querySelector('.speech-context').hidden); assert.deepEqual(await lines(), ['', '', '']);
    await buttons.first().click(); await start(); await page.locator('#site-tts-toggle').click(); assert.equal(await page.locator('.speech-context').count(), 0);
    await page.close();
  }
  console.log('PASS sentence context: actual sentence vs long utterance chunks, prev/current/next, abbreviations/decimals/repeats/filtered content, lifecycle/rate, bottom-right 1280/390/320 light/dark');
} finally { await browser.close(); }
