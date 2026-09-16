import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCases } from '../scripts/case-schema.mjs';

const base = process.env.CASES_BASE_URL || 'http://localhost:4186/';
const source = await readFile(new URL('../reading/it-business-stories.md', import.meta.url), 'utf8');
const stories = [...source.matchAll(/^## (BIZ-\d{2}) · (.+)$/gm)];
const { cases } = parseCases(source);
assert.equal(stories.length, 11);
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
      assert.ok(text.includes('이 글에서 배우는 교훈'));
      assert.ok(!text.includes('추상적인 문장'));
      assert.ok(!text.includes('구체적인 문장'));
      assert.equal(await page.locator('.lesson-concrete strong').innerText(), '구체적으로는');
      assert.equal(await page.locator('.lesson-abstract > p').first().innerText(), cases[index].lesson.abstract);
      assert.equal(await page.locator('.lesson-application').innerText(), cases[index].lesson.concrete);
      assert.equal(await page.locator('.lesson-concrete > p').innerText(), `구체적으로는 ${cases[index].lesson.concrete}`);
      const basis = page.locator('.lesson-basis a');
      assert.equal(await basis.getAttribute('href'), cases[index].lesson.basis.url);
      assert.equal(await basis.innerText(), cases[index].lesson.basis.label);
      assert.equal(await page.locator('.case-lesson').count(), 1);
      assert.ok(await page.locator('.case-lesson').evaluate(box => {
        const bounds = box.getBoundingClientRect();
        const style = getComputedStyle(box);
        const content = [...box.querySelectorAll('h2, h3, p, .lesson-basis a')];
        return content.length === 5 && parseFloat(style.borderTopWidth) > 0
          && style.backgroundColor !== getComputedStyle(box.parentElement).backgroundColor
          && content.every(el => {
            const rect = el.getBoundingClientRect();
            return rect.left >= bounds.left && rect.right <= bounds.right && rect.top >= bounds.top && rect.bottom <= bounds.bottom;
          });
      }), 'title, both labels/sentences and basis stay inside one visible lesson box');
      assert.ok(text.includes('교재 개념:'));
      assert.ok(!text.includes('수업에서 도출할 판단'));
      assert.ok(!text.includes('최종 판단'));
      assert.equal(await page.locator('.case-conclusion h2').innerText(), '결론');
      assert.ok(await page.locator('.case-conclusion').evaluate(el => el === el.parentElement.lastElementChild && parseFloat(getComputedStyle(el).borderTopWidth) > 0 && getComputedStyle(el).backgroundColor !== getComputedStyle(el.parentElement).backgroundColor));
      assert.deepEqual(await page.locator('article > section > h2').allTextContents(), match[1] === 'BIZ-01' ? ['이 글에서 배우는 교훈', '들어가기 전에', '본문', '결론'] : ['이 글에서 배우는 교훈', '본문', '결론']);
      assert.equal(await page.locator('.prerequisites').count(), match[1] === 'BIZ-01' ? 1 : 0);
      if (match[1] === 'BIZ-01') {
        assert.ok(text.includes('들어가기 전에'));
        assert.ok(text.includes('실제 성공 사례'));
        const intro = page.getByRole('region', { name: '들어가기 전에' });
        assert.equal(await intro.locator('p').count(), 2);
        assert.ok((await intro.innerText()).endsWith('실제 성공 사례를 다룬다.'));
        assert.ok((await page.locator('.case-body p').first().innerText()).startsWith('상품을 사러 온 고객에게'));
        assert.ok(await intro.evaluate(el => {
          const style = getComputedStyle(el);
          return style.backgroundColor !== getComputedStyle(el.parentElement).backgroundColor && parseFloat(style.borderTopWidth) > 0 && parseFloat(style.marginBottom) >= 24;
        }));
      }
      const links = await page.locator('.case-references a').evaluateAll(nodes => nodes.map(a => a.href));
      assert.ok(links.some(url => url.startsWith('https://jhs512.github.io/topcit2/textbook/05/#page-')));
      assert.ok(links.every(url => !/jhs512\.github\.io\/topcit2?\/(viewer|sources)\//.test(url)));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('[aria-controls="site-cases"].site-active').innerText(), '사례 모음');
      assert.ok((await page.locator('#site-cases a[aria-current="page"]').getAttribute('href')).endsWith('/cases/05/'));
      await page.reload();
      await page.locator('article h1').waitFor();
      // Follow each newly added basis link to its actual rendered textbook page.
      const target = cases[index].lesson.basis.url.split('/topcit2/')[1];
      if (base.startsWith('http://localhost')) await basis.evaluate((a, url) => { a.href = url; }, new URL(target, base).href);
      await basis.click();
      await page.waitForSelector('body[data-ready="true"]', { timeout: 60000 });
      const hash = new URL(cases[index].lesson.basis.url).hash;
      await page.waitForFunction(hash => {
        const box = document.querySelector(hash)?.getBoundingClientRect();
        return box && box.top < innerHeight && box.bottom > 100;
      }, hash);
      assert.ok((await page.locator(hash).innerText()).length > 30);
      await page.goto(new URL(`cases/05/${cases[index].id}/`, base).href);
      if (index === 0) {
        await page.getByRole('link', { name: /다음 사례/ }).click();
        await page.getByRole('heading', { name: stories[1][2], exact: true }).waitFor();
        await page.getByRole('link', { name: /이전 사례/ }).click();
      }
      await page.getByRole('navigation', { name: '사례 이동' }).getByRole('link', { name: '사례 목록', exact: true }).click();
    }
    if (viewport.width < 760) await page.getByRole('button', { name: /메뉴/ }).click();
    await page.locator('[aria-controls="site-cases"]').click();
    await page.locator('#site-cases').getByRole('link', { name: '전체 사례', exact: true }).click();
    await page.getByRole('heading', { name: '어떤 과목을 읽을까요?' }).waitFor();
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: desktop/mobile 11 stories, both lesson sentences, all basis link clicks/anchors, prerequisites, sources, navigation');
} finally {
  await browser.close();
}
