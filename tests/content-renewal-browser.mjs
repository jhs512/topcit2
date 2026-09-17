import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { lectures } from '../lec/content.mjs';

const base = process.env.SITE_BASE || 'http://localhost:4186/';
const lessons=JSON.parse(await readFile(new URL('../reading/case-lessons.json',import.meta.url),'utf8'));
await mkdir(new URL('../test-results/content-renewal/', import.meta.url), {recursive:true});
const browser = await chromium.launch();
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({viewport:{width,height:1000}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    for (const lecture of lectures) {
      await page.goto(new URL(`lec/${lecture.date}/`,base).href);
      const blocks=page.locator('.lesson-block');
      assert.equal(await blocks.count(),lecture.sections.length);
      for (const [i,[title,body]] of lecture.sections.entries()) {
        assert.equal(await blocks.nth(i).locator('h3').innerText(),title);
        const paragraphs=body.split(/\n\s*\n/);
        assert.deepEqual(await blocks.nth(i).locator(':scope > p.tts-readable:not(.question)').allTextContents(),paragraphs);
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.goto(new URL('practical/03/#concept-1',base).href);
    await page.locator('#concept-1').scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/content-renewal/note-${width}.png`});
    await page.goto(new URL('cases/03/ARCH-01/',base).href);
    const lessonText=await page.locator('.case-lesson').innerText();
    assert.ok(lessonText.includes(lessons['ARCH-01'].principle));
    assert.ok(lessonText.includes(lessons['ARCH-01'].application));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`test-results/content-renewal/case-${width}.png`});
    await page.goto(new URL('lec/2026-09-17/#summary',base).href);
    await page.locator('.lesson-block').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/content-renewal/lecture-${width}.png`});
    const theme=page.locator('#site-theme-toggle');
    await theme.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    for(const route of ['practical/03/#concept-1','cases/03/ARCH-01/','lec/2026-09-17/']) {
      await page.goto(new URL(route,base).href);
      await page.locator('#site-theme-toggle').waitFor();
      assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.locator('.lesson-block').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/content-renewal/lecture-dark-${width}.png`});
    assert.deepEqual(errors,[]);
    await page.close();
  }
  const bank=JSON.parse(await readFile(new URL('../practice/data/software.json',import.meta.url),'utf8'));
  const sample=bank.find(q=>q.kind==='code');
  const page=await browser.newPage({viewport:{width:390,height:1000}});
  await page.goto(new URL('practice/01/?mode=all#question-'+sample.id,base).href);
  const card=page.locator(`[data-question-id="${sample.id}"]`);
  await card.locator(`input[value="${sample.answer}"]`).check();
  await card.getByRole('button',{name:'정답 확인',exact:true}).click();
  await card.locator('.feedback').waitFor();
  const parts=await card.locator('.feedback > p.tts-readable').allTextContents();
  assert.ok(parts.some(p=>p.startsWith('핵심 개념:')));
  assert.ok(parts.some(p=>p.startsWith('정답인 이유:')&&p.includes('1단계')));
  assert.ok(parts.some(p=>p.startsWith('오답 구분:')));
  await card.locator('.feedback').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/content-renewal/explanation-390.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log('Rewritten lecture paragraphs match their titles at 1440/390/320; multi-paragraph explanation grades correctly. Screenshots saved.');
} finally {await browser.close();}
