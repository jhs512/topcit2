import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) for (const fallback of [false, true]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    await page.addInitScript(fallback => {
      localStorage.setItem('topcit2:tts-enabled', 'true');
      if (fallback) window.Highlight = undefined;
      const fake = new EventTarget(); fake.spoken = [];
      fake.getVoices = () => [{ lang: 'ko-KR', name: 'test' }];
      fake.cancel = fake.resume = () => {}; fake.speak = u => fake.spoken.push(u);
      Object.defineProperty(window, 'speechSynthesis', { value: fake });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text; } } });
    }, fallback);
    const clear = async () => assert.equal(await page.evaluate(() => !!CSS.highlights?.get('speech-sentence') || !!document.querySelector('.speech-range-overlay')), false);
    const current = async () => page.evaluate(() => [...(CSS.highlights?.get('speech-sentence') || [])].map(r => r.toString()).join(''));
    for (const route of ['cases/05/BIZ-08/', 'practice/05/', 'textbook/01/#page-022']) {
      await page.goto(new URL(route, base).href);
      if (route.startsWith('textbook')) await page.waitForSelector('body[data-ready="true"]');
      await page.locator('.block-speech-button').first().waitFor();
      await page.evaluate(() => {
        const div = document.createElement('div'); div.id = 'highlight-fixture'; div.dataset.ttsContent = '';
        div.innerHTML = '<p class="tts-readable" id="sentence-text">같은 문장. 같은 문장. <strong>API v2.5</strong>입니다.\n중간 <a href="#kept">링크</a> 뒤입니다. '+ '긴한글 '.repeat(100) +'끝.</p><table><tbody><tr><td class="tts-readable" id="cell-text">표의 첫 문장. 다음 문장.</td></tr></tbody></table><ul><li class="tts-readable"><p>목록의 문장. 끝입니다.</p></li></ul>';
        document.querySelector('main').append(div);
        window.link = div.querySelector('a'); window.strong = div.querySelector('strong');
        link.addEventListener('click', e => { e.preventDefault(); window.linkClicked = true; });
      });
      const target = page.locator('#sentence-text'); const button = target.locator('button'); await button.waitFor();
      const html = await target.innerHTML();
      await button.click(); await clear();
      await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      if (!fallback) assert.equal(await current(), '같은 문장.');
      else assert.ok(await page.locator('.speech-range-overlay span').count());
      if (!fallback) assert.equal(await page.evaluate(() => [...CSS.highlights.get('speech-sentence')][0].startOffset), 0);
      await page.getByRole('button', { name: '일시정지', exact: true }).click();
      if (!fallback) assert.equal(await current(), '같은 문장.');
      await page.getByRole('button', { name: '이어읽기', exact: true }).click();
      await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      await page.evaluate(() => speechSynthesis.spoken.at(-1).onend()); await clear();
      await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      if (!fallback) assert.equal(await page.evaluate(() => [...CSS.highlights.get('speech-sentence')][0].startOffset), 7);
      // Every remaining spoken chunk must equal its painted source text, including long chunks.
      let count = 0;
      while (await page.locator('.speech-controls').getAttribute('data-state') !== 'ended') {
        const beforeStart = await page.evaluate(() => scrollY);
        await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
        assert.equal(await page.evaluate(() => scrollY), beforeStart);
        if (!fallback) {
          assert.equal((await current()).replace(/\s+/g, ' '), await page.evaluate(() => speechSynthesis.spoken.at(-1).text));
          assert.ok(await page.evaluate(() => [...CSS.highlights.get('speech-sentence')].every(r => !r.startContainer.parentElement.closest('a,button'))));
        }
        await page.evaluate(() => speechSynthesis.spoken.at(-1).onend());
        assert.ok(++count < 30);
      }
      await clear();
      assert.equal(await target.innerHTML(), html);
      assert.ok(await page.evaluate(() => link === document.querySelector('#sentence-text a') && strong === document.querySelector('#sentence-text strong')));
      await target.locator('a').click(); assert.equal(await page.evaluate(() => linkClicked), true);
      // Dark mode must keep the same source ranges; no source rewriting in either renderer.
      await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
      await page.locator('#cell-text button').click(); await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      if (!fallback) assert.equal(await current(), '표의 첫 문장.');
      await page.getByRole('button', { name: '정지', exact: true }).click(); await clear();
      await button.click(); await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      await target.evaluate(p => p.firstChild.data = '변경된 내용.'); await page.waitForFunction(() => document.querySelector('.speech-controls').hidden); await clear();
      await button.click(); await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      // Equal normalized speech can still have different source offsets.
      await target.evaluate(p => p.firstChild.data = '변경된  내용.'); await page.waitForFunction(() => document.querySelector('.speech-controls').hidden); await clear();
      await button.click(); await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      await page.locator('#cell-text button').click(); await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      if (!fallback) assert.equal(await current(), '표의 첫 문장.');
      await page.getByRole('button', { name: '정지', exact: true }).click(); await clear();
      await button.click(); await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      await page.locator('#site-tts-toggle').click(); await clear();
      assert.equal(await target.locator('button').count(), 0);
      await page.locator('#site-tts-toggle').click(); await target.locator('button').waitFor();
      await target.locator('button').click(); await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      await page.evaluate(() => dispatchEvent(new Event('site-route-change'))); await clear();
    }
    await page.close();
  }
  console.log('PASS sentence highlight: native/fallback × PC/mobile × cases/quiz/book, exact repeated/inline/link/long offsets, events/pause/resume/stop/end/OFF/mutation/navigation, dark DOM preservation, no auto-scroll');
} finally { await browser.close(); }
