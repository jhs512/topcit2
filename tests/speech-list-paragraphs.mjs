import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const base = process.env.SITE_BASE || 'http://localhost:4186/';
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.addInitScript(() => localStorage.setItem('topcit2:tts-enabled', 'true'));
    await page.goto(new URL('textbook/01/#page-022', base).href);
    await page.waitForSelector('body[data-ready="true"]');
    const short = page.locator('#page-022 li').filter({ hasText: /^용어의 표준화/ }).first();
    await short.locator('button').waitFor();
    const check = async (li, allowWrap = false) => {
      const result = await li.evaluate(n => {
        const button = n.querySelector('.block-speech-button'), p = n.querySelector(':scope > p');
        const range = document.createRange(); range.selectNodeContents(p);
        range.setEndBefore(p.contains(button) ? button : p.lastChild);
        const lines = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0), last = lines.at(-1);
        const b = button.getBoundingClientRect();
        return { inParagraph: p.contains(button), inline: last && b.top < last.bottom && b.bottom > last.top, after: last && b.left >= last.right, w: b.width, h: b.height, display: getComputedStyle(n).display, inBounds: b.right <= innerWidth, wrapGap: last && b.top - last.bottom, buttons: n.querySelectorAll('.block-speech-button').length };
      });
      assert.ok(result.inParagraph && (result.inline && result.after || allowWrap && result.wrapGap >= 0 && result.wrapGap < 25) && result.inBounds && result.w === 44 && result.h === 44 && result.display === 'list-item' && result.buttons === 1, `${width}: ${JSON.stringify(result)}`);
    };
    await check(short);
    for (const text of ['프로젝트 비용 산정과 개발 계획 수립, 기본 골격 구성', '프로젝트 관리']) {
      await check(page.locator('#page-022 li').filter({ hasText: new RegExp(`^${text}`) }).first(), true);
    }
    await page.locator('#page-022').evaluate(n => {
      const ul = document.createElement('ul'); ul.id = 'list-fixture';
      ul.innerHTML = '<li class="tts-readable"><p class="tts-readable">긴 항목에서도 여러 줄의 설명이 자연스럽게 이어지고 목록의 들여쓰기와 문장 순서가 유지되어야 합니다. <a href="#page-022">참고</a> 끝입니다.</p><ul><li>중첩 항목</li></ul></li>';
      n.append(ul);
    });
    const fixture = page.locator('#list-fixture > li'); await fixture.locator('button').waitFor(); await check(fixture, true);
    assert.equal(await fixture.locator('ul li').innerText(), '중첩 항목');
    assert.equal(await fixture.locator('a').getAttribute('href'), '#page-022');
    // Replacing a paragraph must move the button to the new text block.
    await fixture.locator(':scope > p').evaluate(p => { const next = document.createElement('p'); next.textContent = '동적으로 바뀐 문장'; p.replaceWith(next); });
    await fixture.locator('p button').waitFor(); await check(fixture);
    await page.locator('#site-tts-toggle').click();
    assert.equal(await fixture.locator('button,.speech-block').count(), 0);
    await page.locator('#site-tts-toggle').click(); await fixture.locator('p button').waitFor(); await check(short); await check(fixture);
    await page.close();
  }
  console.log('PASS list paragraphs: actual page22 short/long items, nested/link fixture, dynamic replacement, OFF/re-ON at 1440/390/320px');
} finally { await browser.close(); }
