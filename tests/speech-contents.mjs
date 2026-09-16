import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { books } from '../output/markdown/books.mjs';

// Independent expectations from the actual Markdown contents tables, including their last pages.
const expected = { '01': [8,16], '02': [8,19], '03': [8,21], '04': [8,13], '05': [8,15], '06': [8,14] };
const base = process.env.SITE_BASE || 'http://localhost:4186/';
let total = 0;
for (const book of books) {
  const source = await readFile(new URL(book.source, new URL('../output/markdown/', import.meta.url)), 'utf8');
  const pages = [...source.matchAll(/<!-- PDF page: (\d{3}) -->([\s\S]*?)(?=<!-- PDF page:|$)/g)];
  const actual = pages.filter(([, , body]) => /^\|\s*목차\s*\|\s*(?:책 쪽수|교재 쪽수|쪽)\s*\|/m.test(body)).map(([ , id]) => Number(id));
  const [first, last] = expected[book.id];
  assert.deepEqual(actual, Array.from({ length: last - first + 1 }, (_, i) => first + i), `${book.id}: all real contents pages, no gaps or missing last page`);
  assert.ok(pages.find(([ , id]) => Number(id) === book.startPage)[2].includes('## I.'));
  total += actual.length;
}

const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    await page.addInitScript(() => localStorage.setItem('topcit2:tts-enabled', 'true'));
    for (const book of books) {
      const [first, last] = expected[book.id];
      await page.goto(new URL(`textbook/${book.id}/#page-${String(last).padStart(3,'0')}`, base).href);
      await page.waitForSelector('body[data-ready="true"]', { timeout: 60000 });
      await page.locator('.book-page[data-tts-content] .block-speech-button').first().waitFor();
      const checkContents = async () => {
        const result = await page.locator('.book-page').evaluateAll((nodes, { first, last }) => nodes.filter(n => Number(n.id.slice(5)) >= first && Number(n.id.slice(5)) <= last).map(n => ({ id: n.id, excluded: n.hasAttribute('data-tts-exclude'), content: n.hasAttribute('data-tts-content'), markers: n.querySelectorAll('.tts-readable,.block-speech-button').length, tableExcluded: [...n.querySelectorAll('table')].every(t => t.hasAttribute('data-tts-exclude')) })), { first, last });
        assert.equal(result.length, last - first + 1);
        for (const r of result) assert.ok(r.excluded && !r.content && r.markers === 0 && r.tableExcluded, `${book.id}/${r.id}: ${JSON.stringify(r)}`);
      };
      await checkContents();
      const target = `#page-${String(last).padStart(3,'0')}`;
      await page.locator(`${target} .block-bar button`).first().click();
      await page.locator('#zoom-dialog[open]').waitFor();
      assert.equal(await page.locator('#zoom-content table[data-tts-exclude]').count(), 1);
      // Simulate a broad/legacy marker pass after the table moved out of its original page.
      await page.locator('#zoom-content table').evaluate(table => { table.dataset.ttsContent = ''; table.querySelectorAll('th,td').forEach(n => n.classList.add('tts-readable')); });
      await page.waitForFunction(() => !document.querySelector('#zoom-content .tts-readable,#zoom-content .block-speech-button'));
      await page.locator('#zoom-close').click();
      // Explicit exclusion wins even if the contents page itself accidentally opts into content.
      await page.locator(target).evaluate(n => { n.dataset.ttsContent = ''; n.querySelectorAll('p,th,td,h1,h2').forEach(e => e.classList.add('tts-readable')); });
      await page.waitForFunction(selector => !document.querySelector(selector).querySelector('.tts-readable,.block-speech-button'), target);
      await page.locator(target).evaluate(n => n.removeAttribute('data-tts-content'));
      // The page range and structural table test each work without relying on startPage.
      await page.evaluate(async ({ book, last, target, policyURL }) => {
        const { applyBookSpeechPolicy } = await import(policyURL);
        for (const number of [last, 999]) {
          const clone = document.querySelector(target).cloneNode(true);
          clone.removeAttribute('data-tts-exclude'); clone.dataset.ttsContent = '';
          if (number === last) clone.querySelectorAll('table').forEach(t => t.remove());
          applyBookSpeechPolicy(clone, { ...book, startPage: 1 }, number);
          if (!clone.hasAttribute('data-tts-exclude') || clone.hasAttribute('data-tts-content')) throw Error('Contents must be excluded independently of startPage');
        }
      }, { book, last, target, policyURL: new URL('output/markdown/book-speech-policy.mjs', base).href });
      await page.locator('#site-tts-toggle').click();
      await page.locator('#site-tts-toggle').click();
      await page.locator('.book-page[data-tts-content] .block-speech-button').first().waitFor();
      await checkContents();
      assert.ok(await page.locator('.book-page[data-book-section="body"] h2 .block-speech-button').count());
      assert.ok(await page.locator('.book-page[data-book-section="body"] table .block-speech-button').count());
      assert.equal(await page.locator('.page-label .block-speech-button,.block-bar .block-speech-button').count(), 0);
    }
    await page.close();
  }
  console.log(`PASS contents: ${total} actual contents pages across six books × PC/mobile; all headings/table headers/cells excluded, last-page zoom/legacy markers/re-ON guarded; educational titles/tables retained`);
} finally { await browser.close(); }
