import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { caseSubjects } from '../shared/case-catalog.mjs';
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const reveal = async () => { if (width < 760 && await page.locator('.site-toggle').getAttribute('aria-expanded') === 'false') await page.locator('.site-toggle').click(); };
    await page.goto(base);
    await reveal();
    for (const id of ['site-textbooks', 'site-practice', 'site-cases']) {
      const button = page.locator(`[aria-controls="${id}"]`);
      const geometry = await button.evaluate(b => {
        const label = b.querySelector('span').getBoundingClientRect(), icon = b.querySelector('svg').getBoundingClientRect(), box = b.getBoundingClientRect();
        return { delta: Math.abs(label.y + label.height / 2 - icon.y - icon.height / 2), center: Math.abs(box.y + box.height / 2 - icon.y - icon.height / 2), height: box.height };
      });
      assert.ok(geometry.delta < 1 && geometry.center < 1 && geometry.height >= 44, JSON.stringify(geometry));
      await button.focus(); await page.keyboard.press('ArrowDown');
      assert.equal(await page.locator(`#${id} a`).first().evaluate(a => a === document.activeElement), true);
      await page.keyboard.press('Escape');
      assert.equal(await button.evaluate(b => b === document.activeElement), true);
      assert.equal(await button.getAttribute('aria-expanded'), 'false');
      await page.keyboard.press('Enter');
      assert.equal(await button.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      await page.keyboard.press('Space');
      assert.equal(await button.getAttribute('aria-expanded'), 'true');
      await page.mouse.click(2, 940);
      assert.equal(await button.getAttribute('aria-expanded'), 'false');
      await reveal();
    }
    await page.locator('[aria-controls="site-cases"]').click();
    const links = await page.locator('#site-cases a').evaluateAll(nodes => nodes.map(n => ({ text: n.textContent, href: n.href })));
    assert.deepEqual(links.map(l => l.text), ['전체 사례', ...caseSubjects.map(b => `${b.id} ${b.title}`)]);
    for (const link of links) {
      await page.goto(link.href);
      await reveal();
      assert.equal(await page.locator('[aria-controls="site-cases"]').evaluate(b => b.classList.contains('site-active')), true);
      await page.locator('[aria-controls="site-cases"]').click();
      assert.equal(await page.locator('#site-cases [aria-current="page"]').count(), 1);
      assert.equal(await page.locator('#site-cases [aria-current="page"]').getAttribute('href'), link.href);
      assert.equal(await page.locator('main h1').count(), 1);
    }
    await page.goto(new URL('cases/', base).href);
    const catalogLinks = await page.locator('main .area-card').evaluateAll(nodes => nodes.map(n => n.href));
    assert.deepEqual(catalogLinks, links.slice(1).map(l => l.href));
    for (const subject of catalogLinks) {
      await page.goto(subject);
      const stories = await page.locator('.case-list a').evaluateAll(nodes => nodes.map(n => n.href));
      assert.ok(stories.length);
      for (const story of stories) {
        const response = await page.goto(story); assert.equal(response.status(), 200);
        await page.locator('[aria-controls="site-cases"].site-active').waitFor({ state: 'attached' });
        assert.equal(await page.locator('#site-cases [aria-current="page"]').getAttribute('href'), subject);
        assert.equal(await page.locator('.story .case-lesson').count(), 1);
      }
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.close();
  }
  console.log('PASS dropdowns: 1440/390/320px centered labels/icons, all three keyboard menus, Escape/outside click, catalog-only case links, all ten stories and current location');
} finally { await browser.close(); }
