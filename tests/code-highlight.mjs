import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://127.0.0.1:4197/';
const browser = await chromium.launch();
try {
  for (const [subject, file, language] of [['01', 'software', 'Python 3'], ['02', 'data', 'SQL']]) {
    const bank = JSON.parse(await readFile(new URL(`../practice/data/${file}.json`, import.meta.url)));
    const expected = bank.filter(q => q.code && q.language === language);
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(new URL(`practice/${subject}/?mode=all`, base).href);
    await page.locator('pre code.syntax-highlight').first().waitFor();
    const actual = await page.locator('[data-question-id] pre code').evaluateAll(nodes => Object.fromEntries(nodes.map(code => [code.closest('[data-question-id]').dataset.questionId, { text: code.textContent, colored: !!code.querySelector('.token') }])));
    for (const q of expected) { assert.equal(actual[q.id]?.text, q.code, q.id); assert.ok(actual[q.id]?.colored, q.id); }
    const sample = page.locator('pre code.syntax-highlight').first();
    const keyword = sample.locator('.token.keyword').first();
    const light = await keyword.evaluate(e => getComputedStyle(e).color);
    await page.locator('#site-theme-toggle').click();
    const dark = await keyword.evaluate(e => getComputedStyle(e).color);
    assert.notEqual(light, dark);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    // Text coming from code is escaped by the grammar; it must never create live HTML.
    await page.evaluate(() => { const pre = document.createElement('pre'); const code = document.createElement('code'); code.dataset.language = 'python'; code.textContent = 'print("<img src=x onerror=alert(1)>")'; pre.append(code); document.body.append(pre); });
    await page.locator('body > pre .syntax-highlight').waitFor();
    assert.equal(await page.locator('body > pre img').count(), 0);
    assert.deepEqual(errors, []);
    console.log(`${language}: ${expected.length} unchanged highlighted blocks, dark theme and mobile passed`);
    await page.close();
  }
} finally { await browser.close(); }
