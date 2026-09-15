import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.CASES_BASE_URL || 'http://localhost:4186/';
const source = await readFile(new URL('../reading/it-business-stories.md', import.meta.url), 'utf8');
const stories = [...source.matchAll(/^## (BIZ-\d{2}) · (.+)$/gm)];
assert.equal(stories.length, 10);
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.locator('main').getByRole('link', { name: /사례 모음/ }).click();
    await page.getByRole('heading', { name: '어떤 과목을 읽을까요?' }).waitFor();
    await page.locator('main').getByRole('link', { name: /IT비즈니스와 윤리/ }).click();
    assert.equal(await page.locator('.case-list > a').count(), stories.length);
    for (const [index, match] of stories.entries()) {
      await page.locator('.case-list > a').nth(index).click();
      assert.equal(await page.locator('article h1').innerText(), match[2]);
      const text = await page.locator('article').innerText();
      assert.ok(text.includes('이 글에서 배울 교훈'));
      assert.ok(text.includes('교재 개념:'));
      if (index === 0) {
        assert.ok(text.includes('이야기를 읽기 전에'));
        assert.ok(text.includes('실제 성공 사례'));
      }
      const links = await page.locator('article a').evaluateAll(nodes => nodes.map(a => a.href));
      assert.ok(links.some(url => url.startsWith('https://jhs512.github.io/topcit/viewer/index.html?book=05&page=')));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('#site-links > a[aria-current="page"]').innerText(), '사례 모음');
      await page.reload();
      await page.locator('article h1').waitFor();
      if (index === 0) {
        await page.getByRole('link', { name: /다음 사례/ }).click();
        await page.getByRole('heading', { name: stories[1][2], exact: true }).waitFor();
        await page.getByRole('link', { name: /이전 사례/ }).click();
      }
      await page.getByRole('navigation', { name: '사례 이동' }).getByRole('link', { name: '사례 목록', exact: true }).click();
    }
    if (viewport.width < 760) await page.getByRole('button', { name: /메뉴/ }).click();
    await page.locator('#site-links').getByRole('link', { name: '사례 모음', exact: true }).click();
    await page.getByRole('heading', { name: '어떤 과목을 읽을까요?' }).waitFor();
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: desktop/mobile hub → subject → 10 stories, prerequisites, sources, reload, previous/next and shared menu');
} finally {
  await browser.close();
}
