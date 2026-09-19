import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://127.0.0.1:4197/';
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('topcit2:tts-enabled', 'true');
      const synth = new EventTarget(); synth.spoken = [];
      synth.getVoices = () => [{ lang: 'ko-KR', name: 'test' }];
      synth.cancel = synth.resume = () => {}; synth.speak = u => synth.spoken.push(u);
      Object.defineProperty(window, 'speechSynthesis', { value: synth });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text; } } });
    });
    await page.goto(new URL('practical/03/', base).href);
    await page.locator('.block-speech-button').first().waitFor();
    const fixtures = [
      ['power', 'O(n<sup>1.5</sup>)와 log<sub>2</sub>n', '빅오 엔의 일 점 오제곱와 밑이 이인 로그 엔'],
      ['footnote', '설계 원리<sup>1</sup>를 확인한다.', '설계 원리 각주 1 를 확인한다.'],
      ['index', 'n<sub>1</sub>과 2<sup>24</sup>', '엔 아래첨자 1과 이의 이십사제곱'],
      ['code', '연산 <code><span>n</span> ^ <span>2</span></code>와 <code>x % 2</code>', '연산 n ^ 2와 x % 2'],
      ['override', '<span data-tts-text="이분의 일">1/<strong>2</strong></span>', '이분의 일'],
      ['list', 'logn, n, nlogn, n², n³, 2ⁿ', '로그엔, 엔, 엔로그엔, 엔제곱, 엔세제곱, 이엔제곱'],
    ];
    for (const [id, html, expected] of fixtures) {
      await page.evaluate(({id,html}) => { const div=document.createElement('div');div.dataset.ttsContent='';div.innerHTML=`<p class="tts-readable" id="${id}">${html}</p>`;document.querySelector('main').append(div); }, {id,html});
      const block = page.locator('#'+id); const button=block.locator('button'); await button.waitFor();
      const original = await block.innerHTML();
      await button.click();
      assert.equal(await page.evaluate(() => speechSynthesis.spoken.at(-1).text), expected, id);
      await page.evaluate(() => speechSynthesis.spoken.at(-1).onstart());
      const highlighted = await page.evaluate(() => [...CSS.highlights.get('speech-sentence')].map(r=>r.toString()).join(''));
      const display = await block.evaluate(e => [...e.childNodes].filter(n=>n.nodeName!=='BUTTON').map(n=>n.textContent).join(''));
      assert.equal(highlighted, display, id+' highlight');
      assert.equal(await block.innerHTML(), original, id+' original DOM');
      await page.getByRole('button',{name:'정지',exact:true}).click();
    }
    assert.deepEqual(errors, []);
    console.log(`${width}px: semantic superscripts, footnotes, code, overrides, utterances and original highlights passed`);
    await page.close();
  }
} finally { await browser.close(); }
