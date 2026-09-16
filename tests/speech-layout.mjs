import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
let checks = 0;
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.addInitScript(() => localStorage.setItem('topcit2:tts-enabled', 'true'));
    for (const route of ['textbook/01/#page-018', 'practice/05/', 'cases/05/BIZ-09/']) {
      await page.goto(new URL(route, base).href);
      if (route.startsWith('textbook/')) await page.waitForSelector('body[data-ready="true"]', { timeout: 60000 });
      await page.locator('.block-speech-button').first().waitFor();
      const selectors = route.startsWith('textbook/') ? ['#page-018 h2', '#book p', '#book li', '#book td'] : route.startsWith('practice/') ? ['#prompt', '.tts-option'] : ['article h1', '.lesson-concrete p', '.case-body p'];
      for (const selector of selectors) {
        const button = page.locator(`${selector} > .block-speech-button`).first();
        await button.waitFor();
        for (const state of ['hover', 'focus']) {
          if (state === 'hover') await button.hover();
          else { await button.focus(); await page.keyboard.press('ArrowRight'); }
          const geometry = await button.evaluate(b => {
            const r = b.getBoundingClientRect(), svg = b.querySelector('svg').getBoundingClientRect();
            const path = b.querySelector('path'), shape = path.getBBox(), matrix = path.getScreenCTM();
            const center = new DOMPoint(shape.x + shape.width / 2, shape.y + shape.height / 2).matrixTransform(matrix);
            const text = b.parentElement.querySelector(':scope > .speech-heading-text')?.getBoundingClientRect();
            return { dx: svg.x + svg.width / 2 - r.x - r.width / 2, dy: svg.y + svg.height / 2 - r.y - r.height / 2, shapeDx: center.x - r.x - r.width / 2, shapeDy: center.y - r.y - r.height / 2, w: r.width, h: r.height, titleDy: text ? r.y + r.height / 2 - text.y - text.height / 2 : 0, gap: text ? r.x - text.right : 8, outline: getComputedStyle(b).outlineStyle, inViewport: r.left >= 0 && r.right <= innerWidth };
          });
          for (const key of ['dx', 'dy', 'shapeDx', 'shapeDy', 'titleDy']) assert.ok(Math.abs(geometry[key]) <= 1, `${width}/${route}/${selector}/${state}: ${key}=${geometry[key]}`);
          assert.ok(geometry.gap >= 7 && geometry.gap <= 9);
          assert.ok(geometry.w >= 44 && geometry.h >= 44 && geometry.inViewport);
          if (state === 'focus') assert.equal(geometry.outline, 'solid');
          checks++;
        }
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    // Long content heading wraps without pushing its button out of the content.
    await page.locator('article h1 .speech-heading-text').evaluate(el => { el.textContent = '긴 제목에서도 읽기 버튼이 본문 제목 옆에 정렬되고 좁은 모바일 화면 밖으로 벗어나지 않아야 합니다'; });
    await page.locator('article h1 .block-speech-button').waitFor();
    assert.ok(await page.locator('article h1').evaluate(h => { const t = h.querySelector('.speech-heading-text').getBoundingClientRect(), b = h.querySelector('button').getBoundingClientRect(), r = h.getBoundingClientRect(); return b.left >= t.right && b.right <= r.right + 1 && Math.abs(b.y + b.height / 2 - t.y - t.height / 2) < 1; }));
    await page.locator('#site-tts-toggle').click();
    assert.equal(await page.locator('.speech-heading-text,.speech-heading,.block-speech-button').count(), 0);
    await page.locator('#site-tts-toggle').click(); await page.locator('article h1 .block-speech-button').waitFor();
    assert.equal(await page.locator('article h1 .speech-heading-text').count(), 1);
    await page.close();
  }
  console.log(`PASS layout: ${checks} hover/focus cases; SVG and triangle centered within 1px, titles adjacent/centered, 44px targets, paragraphs/lists/tables/options/cases, long mobile title and OFF/re-ON cleanup`);
} finally { await browser.close(); }
