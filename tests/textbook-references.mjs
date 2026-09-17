import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { books } from '../output/markdown/books.mjs';
import { subjects } from '../practical/content.mjs';
import { expandedCaseSources } from '../scripts/expanded-case-source.mjs';
import { parseCases } from '../scripts/case-schema.mjs';
import { caseAlignment, textbookTitle, textbookUrl } from '../shared/textbook-alignment.mjs';
const root = new URL('../', import.meta.url);
const files = ['README.md', 'notes/contents-links.md', 'notes/exam-mapping.md', 'reading/it-business-stories.md', 'reading/it-business-stories-plan.md'];
const sources = new Map();
for (const book of books) sources.set(book.id, await readFile(new URL(book.source, new URL('output/markdown/', root)), 'utf8'));
const targets = new Set();
for (const file of files) {
  const source = await readFile(new URL(file, root), 'utf8');
  assert.ok(!/https:\/\/jhs512\.github\.io\/topcit2?\/sources\//.test(source), file);
  for (const [, id, rawPage] of source.matchAll(/https:\/\/jhs512\.github\.io\/topcit2\/textbook\/(0[1-6])\/#page-(\d{3})/g)) {
    const page = rawPage.padStart(3, '0');
    assert.ok(sources.get(id).split(`<!-- PDF page: ${page} -->`)[1]?.split('<!-- PDF page:')[0]?.trim(), `${file}: ${id}/${page}`);
    targets.add(`${id}/${page}`);
  }
}
const original = parseCases(await readFile(new URL('reading/it-business-stories.md', root), 'utf8')).cases;
const all = [...original.map(c => ({ ...c, subject: '05-01' })), ...expandedCaseSources().flatMap(s => s.cases.map(c => ({ ...c, subject: s.subjectId })))];
const base = process.env.SITE_BASE || 'http://localhost:4186/';
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const subject of subjects) {
      await page.goto(new URL(`practical/${subject.id}/`, base).href);
      assert.equal(await page.locator('.concept > .textbook-connection').count(), 20);
      assert.ok(await page.locator('.textbook-study section').count() >= 4);
      assert.ok(await page.locator('.textbook-study').isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `note ${subject.id}/${width}`);
    }
    for (const c of all) {
      await page.goto(new URL(`cases/${c.subject}/${c.id}/`, base).href);
      const record = caseAlignment(c.id);
      const section = page.locator('.textbook-connection');
      assert.equal(await section.count(), 1);
      assert.ok((await section.innerText()).includes(textbookTitle(record.book)), c.id);
      assert.ok((await section.innerText()).includes(record.concept), c.id);
      assert.ok((await section.innerText()).includes(record.caseReason), c.id);
      assert.equal(await section.locator('a').getAttribute('href'), textbookUrl(record));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${c.id}/${width}`);
    }
    await page.locator('#site-tts-toggle').waitFor();
    assert.equal(await page.locator('#site-tts-toggle').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('.block-speech-button').count(), 0);
    await page.locator('#site-tts-toggle').click();
    await page.locator('.textbook-connection .block-speech-button').first().waitFor();
    await page.locator('#site-tts-toggle').click();
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS ${width}px: 160 cases, 160 notes, textbook connections, overflow, TTS`);
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(new URL('cases/05-01/BIZ-01/', base).href);
  if(base.includes('localhost'))await page.locator('.textbook-connection a').evaluate((a,url)=>{a.href=url},new URL('textbook/05/#page-020',base).href);
  await page.locator('.textbook-connection a').click();
  assert.ok(new URL(page.url()).pathname.endsWith('/textbook/05/'));
  assert.equal(new URL(page.url()).hash,'#page-020');
  await page.locator('#page-020').waitFor({timeout:90000});
  console.log(`PASS: ${targets.size} reference pages exist; textbook link opened exact page 20`);
} finally {
  await browser.close();
}
