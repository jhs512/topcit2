import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { books } from '../output/markdown/books.mjs';

const root = new URL('../', import.meta.url);
const files = ['README.md', 'notes/contents-links.md', 'notes/exam-mapping.md', 'reading/it-business-stories.md', 'reading/it-business-stories-plan.md'];
const references = new Map();
for (const file of files) {
  const source = await readFile(new URL(file, root), 'utf8');
  assert.ok(!/https:\/\/jhs512\.github\.io\/topcit2?\/(viewer|sources)\//.test(source), file);
  for (const [, id, page] of source.matchAll(/https:\/\/jhs512\.github\.io\/topcit2\/textbook\/(0[1-6])\/#page-(\d{3})/g)) {
    if (!references.has(id)) references.set(id, new Set());
    references.get(id).add(page);
  }
}
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const [id, targets] of references) {
      const book = books.find(b => b.id === id);
      const markdown = await readFile(new URL(book.source, new URL('output/markdown/', root)), 'utf8');
      await page.goto(new URL(`textbook/${id}/#page-${[...targets][0]}`, base).href);
      await page.waitForSelector('body[data-ready="true"]', { timeout: 60000 });
      for (const target of targets) {
        const body = markdown.split(`<!-- PDF page: ${target} -->`)[1]?.split('<!-- PDF page:')[0];
        assert.ok(body?.trim(), `${id}/${target}: source page exists`);
        await page.evaluate(hash => { location.hash = hash; }, `page-${target}`);
        await page.waitForFunction(target => {
          const node = document.getElementById(`page-${target}`);
          const box = node?.getBoundingClientRect();
          return box && box.top < innerHeight && box.bottom > 100;
        }, target);
        assert.ok((await page.locator(`#page-${target}`).innerText()).length > 30);
      }
    }
    await page.goto(new URL('cases/05/BIZ-01/', base).href);
    const link = page.locator('article a[href*="/textbook/05/#page-020"]').first();
    const href = await link.getAttribute('href');
    assert.equal(href, 'https://jhs512.github.io/topcit2/textbook/05/#page-020');
    // Route to the same deployment being tested when running locally.
    if (base.startsWith('http://localhost')) await link.evaluate((a, base) => { a.href = new URL('textbook/05/#page-020', base).href; }, base);
    await link.click();
    await page.waitForSelector('body[data-ready="true"]', { timeout: 60000 });
    assert.ok((await page.locator('#page-020').innerText()).includes('비즈니스와 IT의 연계'));
    await page.close();
  }
  console.log(`PASS: ${[...references.values()].reduce((n, pages) => n + pages.size, 0)} textbook page targets across six books, desktop/mobile, case link click`);
} finally {
  await browser.close();
}
