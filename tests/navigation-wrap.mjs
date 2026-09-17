import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const path of ['', 'practical/03/', 'article/03/', 'study/', 'textbook/03/']) {
  for (const width of [1920, 1440, 1280, 1241, 1240, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(new URL(path, process.env.SITE_BASE || 'http://127.0.0.1:4197/').href);
    await page.locator('#site-navigation').waitFor();
    // Also cover a reader using larger navigation text.
    if (process.env.LARGE_NAV) await page.addStyleTag({ content: '#site-navigation{font-size:16px}' });
    const toggle = page.locator('.site-toggle');
    if (await toggle.isVisible()) await toggle.click();
    const problems = await page.locator('#site-navigation').evaluate(bar => {
      const problems = [];
      for (const item of bar.querySelectorAll('nav > a, .site-group > button')) {
        const label = item.querySelector('span') || item;
        const range = document.createRange();
        range.selectNodeContents(label);
        const lines = new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top)));
        if (lines.size !== 1) problems.push(`wrapped: ${label.textContent}`);
        const box = item.getBoundingClientRect();
        if (box.left < 0 || box.right > innerWidth) problems.push(`offscreen: ${label.textContent}`);
      }
      if (document.documentElement.scrollWidth > innerWidth) problems.push('horizontal overflow');
      return problems;
    });
    assert.deepEqual(problems, [], `${path} ${width}px navigation`);
    await page.getByRole('button', { name: '심화수업', exact: true }).click();
    assert.equal(await page.locator('#site-article a').count(), 9);
    assert.ok(await page.getByRole('link', { name: '전체 심화수업', exact: true }).isVisible());
    await page.keyboard.press('Escape');
    assert.ok(await page.locator('#site-article').isHidden());
    console.log(`${path || 'home'} ${width}px: single-line labels, visible links, submenu and Escape passed`);
  }
  }
} finally {
  await browser.close();
}
